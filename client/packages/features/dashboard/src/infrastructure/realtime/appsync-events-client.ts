import type { ChatEvent } from '@features/dashboard/domain/services/chat-event';

export interface AppSyncEventsConfig {
  /** AppSync Events realtime DNS (no protocol, no path). */
  realtimeDns: string;
  /** Namespace name (e.g. 'chat'). */
  namespace: string;
  /** Channel path within the namespace (e.g. '{userId}/responses'). */
  channelPath: string;
  /** Returns the latest Cognito id token (used as the AppSync auth header). */
  getToken: () => Promise<string | null>;
  /** Bubbled up to the caller so it can render an error state. */
  onError?: (error: unknown) => void;
  /**
   * Called after the socket transparently re-subscribes following a drop.
   * The drawer uses it to backfill any messages it missed while offline
   * (AppSync Events does not replay events delivered during the gap).
   */
  onReconnect?: () => void;
}

interface InternalMessage {
  type?: string;
  errors?: unknown;
  event?: string | string[];
  id?: string;
  connectionTimeoutMs?: number;
}

const EVENT_WS_SUBPROTOCOL = 'aws-appsync-event-ws';
/** Reconnect backoff: starts here, doubles, capped at MAX. */
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
/** Fallback idle watchdog if the server doesn't advertise a timeout. */
const DEFAULT_IDLE_TIMEOUT_MS = 60_000;
/**
 * Buffer added on top of the idle timeout before declaring the socket dead,
 * so the watchdog never preempts a keep-alive that's merely a little late.
 */
const IDLE_GRACE_MS = 10_000;

/**
 * Minimal AppSync Events WebSocket client with auto-reconnect.
 *
 * Per the Events API protocol, auth travels in a WebSocket SUBPROTOCOL
 * (browsers can't set custom headers), NOT in the query string:
 *   1. Open the socket against the realtime endpoint with two subprotocols:
 *      `aws-appsync-event-ws` and `header-<base64url(authObject)>`. The auth
 *      object's `host` MUST be the HTTP endpoint domain (not the realtime one).
 *   2. Send `{type: 'connection_init'}` and wait for `connection_ack`.
 *   3. Send a `subscribe` with the channel + the same authorization object —
 *      the server pushes `data` messages we forward to the listener.
 *
 * Long-lived chat sessions outlive a single socket: the connection drops on
 * network blips, idle timeouts, or Cognito token expiry. This client detects
 * that (unexpected close OR no keep-alive within the server's timeout) and
 * transparently reconnects with a FRESH token, then re-subscribes — so the
 * assistant's replies keep arriving without the user reloading the page.
 *
 * @see https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html
 */
export class AppSyncEventsClient {
  private socket: WebSocket | null = null;
  private subscriptionId: string | null = null;
  private listener: ((event: ChatEvent) => void) | null = null;
  private closed = false;
  private hasSubscribedOnce = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS;
  // Settles the promise returned by `subscribe()`. Resolved on the FIRST
  // successful subscription (even if it took a few reconnect attempts) and
  // rejected only on a terminal failure (no auth token) — so the caller never
  // hangs forever when the socket drops mid-handshake.
  private ready: {
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null = null;
  private readySettled = false;

  constructor(private readonly config: AppSyncEventsConfig) {}

  /**
   * Connect, authenticate, and subscribe. Resolves once the subscription is
   * ack'ed; transient drops while connecting are retried transparently rather
   * than rejecting (so the promise resolves as soon as we're connected).
   */
  subscribe(listener: (event: ChatEvent) => void): Promise<void> {
    this.listener = listener;
    this.closed = false;
    this.reconnectAttempts = 0;
    this.hasSubscribedOnce = false;
    this.readySettled = false;
    return new Promise<void>((resolve, reject) => {
      this.ready = { resolve, reject };
      void this.connect();
    });
  }

  /** Settles the `subscribe()` promise exactly once. */
  private settleReady(error?: unknown): void {
    if (this.readySettled || !this.ready) return;
    this.readySettled = true;
    if (error !== undefined) this.ready.reject(error);
    else this.ready.resolve();
  }

  /** Close the socket. Safe to call multiple times. */
  close(): void {
    this.closed = true;
    // Settle a still-pending subscribe() so an awaiting caller never hangs
    // when the drawer closes before the first subscription completes.
    this.settleReady(new Error('AppSync subscription closed'));
    this.clearReconnectTimer();
    this.clearIdleTimer();
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // best effort
      }
      this.socket = null;
    }
    this.listener = null;
    this.subscriptionId = null;
  }

  private async connect(): Promise<void> {
    let token: string | null;
    try {
      token = await this.config.getToken();
    } catch (err) {
      // Transient token fetch failure — surface it and retry.
      this.config.onError?.(err);
      this.scheduleReconnect();
      return;
    }
    if (!token) {
      // No token at all (logged out) is terminal: reject the initial
      // subscribe and stop — retrying without credentials would loop forever.
      this.settleReady(
        new Error('Missing Cognito token for AppSync Events subscription'),
      );
      return;
    }

    // The auth object's `host` must be the HTTP endpoint domain, even though
    // we connect to the realtime endpoint. For standard AppSync domains that
    // means swapping the subdomain; for custom domains both share a host so
    // the replace is a no-op.
    const host = this.config.realtimeDns.replace(
      'appsync-realtime-api',
      'appsync-api',
    );
    const authHeader = { host, Authorization: token };
    const url = `wss://${this.config.realtimeDns}/event/realtime`;
    const authSubprotocol = `header-${base64UrlEncode(
      JSON.stringify(authHeader),
    )}`;

    const ws = new WebSocket(url, [EVENT_WS_SUBPROTOCOL, authSubprotocol]);
    this.socket = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'connection_init' }));
    };

    ws.onerror = (err) => {
      // Don't settle/reject here — `onclose` follows and drives the retry, so
      // the subscribe() promise resolves once a (re)connection succeeds.
      this.config.onError?.(err);
    };

    ws.onmessage = (msgEvent) => {
      // Any inbound frame (including `ka` keep-alives) proves the link is
      // alive — reset the idle watchdog.
      this.resetIdleTimer();

      let parsed: InternalMessage;
      try {
        parsed = JSON.parse(String(msgEvent.data)) as InternalMessage;
      } catch {
        return;
      }

      if (parsed.type === 'connection_ack') {
        if (typeof parsed.connectionTimeoutMs === 'number') {
          this.idleTimeoutMs = parsed.connectionTimeoutMs;
        }
        this.resetIdleTimer();
        this.sendSubscribe(authHeader);
        return;
      }
      if (parsed.type === 'subscribe_success') {
        this.reconnectAttempts = 0;
        const wasReconnect = this.hasSubscribedOnce;
        this.hasSubscribedOnce = true;
        this.settleReady();
        // After a reconnect, replay-from-DB so nothing delivered during the
        // gap is lost.
        if (wasReconnect) this.config.onReconnect?.();
        return;
      }
      if (parsed.type === 'data') {
        this.handleData(parsed);
        return;
      }
      if (parsed.type === 'error' || parsed.errors) {
        this.config.onError?.(parsed);
      }
    };

    ws.onclose = () => {
      this.clearIdleTimer();
      if (!this.closed) {
        // Unexpected drop (possibly mid-handshake, before subscribe_success) —
        // reconnect with a fresh token instead of leaving the chat silently
        // dead. The pending subscribe() promise resolves on the next success.
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_MS,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.closed || !this.listener) return;
      void this.connect();
    }, delay);
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    if (this.closed) return;
    // Wait the server-advertised idle timeout (or the default) plus a grace
    // buffer before declaring the socket dead and forcing a reconnect — the
    // server sends keep-alives well within this window.
    this.idleTimer = setTimeout(() => {
      if (this.closed) return;
      try {
        this.socket?.close();
      } catch {
        // best effort — onclose triggers the reconnect
      }
    }, this.idleTimeoutMs + IDLE_GRACE_MS);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private sendSubscribe(authHeader: Record<string, string>): void {
    this.subscriptionId = generateId();
    const channel = `/${this.config.namespace}/${this.config.channelPath}`;
    this.socket?.send(
      JSON.stringify({
        type: 'subscribe',
        id: this.subscriptionId,
        channel,
        authorization: authHeader,
      }),
    );
  }

  private handleData(parsed: InternalMessage): void {
    if (!this.listener) return;
    // Event APIs deliver `event` as a stringified JSON payload (or, in batch
    // deliveries, an array of them). Normalize to an array and forward each.
    const raw = parsed.event;
    const eventStrings =
      typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw : [];
    for (const eventStr of eventStrings) {
      try {
        const event = JSON.parse(eventStr) as ChatEvent;
        this.listener(event);
      } catch (err) {
        this.config.onError?.(err);
      }
    }
  }
}

function base64UrlEncode(value: string): string {
  if (typeof btoa === 'function') {
    return btoa(value)
      .replace(/=+$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
  // Node fallback (used by Jest, which has no DOM):
  return Buffer.from(value, 'utf-8')
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateId(): string {
  // Cheap unique id for the subscription. No crypto needed; the server
  // just echoes it back so we can correlate.
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
