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
  event?: string;
  id?: string;
}

const AUTH_HEADER_NAME = 'authorization';

/**
 * Minimal AppSync Events WebSocket client.
 *
 * AppSync Events uses two short-lived JSON messages on top of a single
 * WebSocket:
 *   1. The client opens the socket with an `?header=...&payload=...` query
 *      string carrying a SigV4-style auth header (base64-encoded JSON).
 *   2. The client sends `{type: 'connection_init'}` and waits for `connection_ack`.
 *   3. The client sends a `subscribe` with the channel — server pushes
 *      `data` messages we forward to the listener.
 *
 * @see https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-protocol.html
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

    const authHeader = {
      host: this.config.realtimeDns,
      [AUTH_HEADER_NAME]: token,
    };
    const encodedHeader = base64UrlEncode(JSON.stringify(authHeader));
    const encodedPayload = base64UrlEncode('{}');
    const url = `wss://${this.config.realtimeDns}/event/realtime?header=${encodedHeader}&payload=${encodedPayload}`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url, 'aws-appsync-event-ws');
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
    // Event APIs deliver `event` as a stringified JSON payload.
    const eventStr =
      typeof parsed.event === 'string' ? parsed.event : undefined;
    if (!eventStr) return;
    try {
      const event = JSON.parse(eventStr) as ChatEvent;
      this.listener(event);
    } catch (err) {
      this.config.onError?.(err);
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
