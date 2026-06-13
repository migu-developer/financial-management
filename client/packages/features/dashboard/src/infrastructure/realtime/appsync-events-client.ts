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
}

interface InternalMessage {
  type?: string;
  errors?: unknown;
  event?: string | string[];
  id?: string;
}

const EVENT_WS_SUBPROTOCOL = 'aws-appsync-event-ws';

/**
 * Minimal AppSync Events WebSocket client.
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
 * @see https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html
 */
export class AppSyncEventsClient {
  private socket: WebSocket | null = null;
  private subscriptionId: string | null = null;
  private listener: ((event: ChatEvent) => void) | null = null;
  private closed = false;

  constructor(private readonly config: AppSyncEventsConfig) {}

  /** Connect, authenticate, and subscribe. Resolves once the subscription is ack'ed. */
  async subscribe(listener: (event: ChatEvent) => void): Promise<void> {
    this.listener = listener;
    this.closed = false;

    const token = await this.config.getToken();
    if (!token) {
      throw new Error('Missing Cognito token for AppSync Events subscription');
    }

    // The auth object's `host` must be the HTTP endpoint domain, even though
    // we connect to the realtime endpoint. For standard AppSync domains that
    // means swapping the subdomain; for custom domains both share a host so
    // the replace is a no-op.
    const host = this.config.realtimeDns.replace(
      'appsync-realtime-api',
      'appsync-api',
    );
    const authHeader = {
      host,
      Authorization: token,
    };
    const url = `wss://${this.config.realtimeDns}/event/realtime`;
    const authSubprotocol = `header-${base64UrlEncode(JSON.stringify(authHeader))}`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url, [EVENT_WS_SUBPROTOCOL, authSubprotocol]);
      this.socket = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'connection_init' }));
      };

      ws.onerror = (err) => {
        this.config.onError?.(err);
        reject(err);
      };

      ws.onmessage = (msgEvent) => {
        let parsed: InternalMessage;
        try {
          parsed = JSON.parse(String(msgEvent.data)) as InternalMessage;
        } catch {
          return;
        }

        if (parsed.type === 'connection_ack') {
          this.sendSubscribe(authHeader);
          return;
        }
        if (parsed.type === 'subscribe_success') {
          resolve();
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
        if (!this.closed) {
          this.config.onError?.(new Error('AppSync WebSocket closed'));
        }
      };
    });
  }

  /** Close the socket. Safe to call multiple times. */
  close(): void {
    this.closed = true;
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
