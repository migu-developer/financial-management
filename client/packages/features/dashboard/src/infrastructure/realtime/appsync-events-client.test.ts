import { AppSyncEventsClient } from './appsync-events-client';
import type { ChatEvent } from '@features/dashboard/domain/services/chat-event';

/**
 * In-memory WebSocket stub. Lets the test drive `onopen` / `onmessage`
 * to simulate the AppSync Events handshake.
 */
class StubSocket {
  static last: StubSocket | undefined;
  url: string;
  protocols?: string | string[];
  onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
  onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null;
  sent: string[] = [];

  constructor(url: string | URL, protocols?: string | string[]) {
    this.url = String(url);
    this.protocols = protocols;
    StubSocket.last = this;
  }

  send(data: string) {
    this.sent.push(data);
  }
  close() {
    /* no-op */
  }

  simulateOpen() {
    this.onopen?.call(this as unknown as WebSocket, {} as Event);
  }
  simulateMessage(payload: unknown) {
    this.onmessage?.call(
      this as unknown as WebSocket,
      {
        data: JSON.stringify(payload),
      } as MessageEvent,
    );
  }
  simulateClose() {
    this.onclose?.call(this as unknown as WebSocket, {} as CloseEvent);
  }
}

/** Drives an open socket through the full handshake to subscribe_success. */
async function handshake(ws: StubSocket) {
  ws.simulateOpen();
  ws.simulateMessage({ type: 'connection_ack' });
  ws.simulateMessage({ type: 'subscribe_success' });
}

beforeAll(() => {
  (globalThis as unknown as { WebSocket: typeof StubSocket }).WebSocket =
    StubSocket;
});

afterEach(() => {
  StubSocket.last = undefined;
});

const baseConfig = {
  realtimeDns: 'example.appsync-realtime-api.us-east-1.amazonaws.com',
  namespace: 'chat',
  channelPath: 'user-1/responses',
  getToken: jest.fn().mockResolvedValue('mock-id-token'),
};

describe('AppSyncEventsClient', () => {
  it('connects, sends connection_init then subscribe, and resolves on subscribe_success', async () => {
    const client = new AppSyncEventsClient({ ...baseConfig });
    const listener = jest.fn();

    const subscribePromise = client.subscribe(listener);
    // Give the promise's await on getToken a microtask tick.
    await Promise.resolve();
    await Promise.resolve();

    const ws = StubSocket.last!;
    expect(ws).toBeDefined();
    expect(ws.url).toContain('wss://');
    expect(ws.url).toContain('/event/realtime');
    // Auth must NOT be in the query string (that's the legacy GraphQL protocol).
    expect(ws.url).not.toContain('?header=');

    // Events API carries auth in the subprotocols: the constant marker plus
    // `header-<base64url(auth)>`.
    const protocols = ws.protocols as string[];
    expect(Array.isArray(protocols)).toBe(true);
    expect(protocols[0]).toBe('aws-appsync-event-ws');
    expect(protocols[1]).toMatch(/^header-/);
    const decoded = JSON.parse(
      Buffer.from(
        protocols[1]!
          .replace('header-', '')
          .replace(/-/g, '+')
          .replace(/_/g, '/'),
        'base64',
      ).toString('utf-8'),
    ) as Record<string, string>;
    expect(decoded.Authorization).toBe('mock-id-token');
    // host must be the HTTP endpoint domain, not the realtime one.
    expect(decoded.host).toBe('example.appsync-api.us-east-1.amazonaws.com');

    ws.simulateOpen();
    expect(JSON.parse(ws.sent[0]!)).toEqual({ type: 'connection_init' });

    ws.simulateMessage({ type: 'connection_ack' });
    const subscribeMsg = JSON.parse(ws.sent[1]!) as Record<string, unknown>;
    expect(subscribeMsg.type).toBe('subscribe');
    expect(subscribeMsg.channel).toBe('/chat/user-1/responses');
    expect(subscribeMsg.authorization).toEqual(
      expect.objectContaining({ Authorization: 'mock-id-token' }),
    );

    ws.simulateMessage({ type: 'subscribe_success' });
    await expect(subscribePromise).resolves.toBeUndefined();
    client.close();
  });

  it('forwards parsed chat events to the listener', async () => {
    const client = new AppSyncEventsClient({ ...baseConfig });
    const listener = jest.fn();

    const subscribePromise = client.subscribe(listener);
    await Promise.resolve();
    await Promise.resolve();

    const ws = StubSocket.last!;
    ws.simulateOpen();
    ws.simulateMessage({ type: 'connection_ack' });
    ws.simulateMessage({ type: 'subscribe_success' });
    await subscribePromise;

    const event: ChatEvent = {
      type: 'assistant_message',
      sessionId: 's1',
      messageId: 'm1',
      content: 'Hola!',
    };
    ws.simulateMessage({
      type: 'data',
      event: JSON.stringify(event),
    });

    expect(listener).toHaveBeenCalledWith(event);
    client.close();
  });

  it('rejects subscribe() when getToken returns null', async () => {
    const client = new AppSyncEventsClient({
      ...baseConfig,
      getToken: jest.fn().mockResolvedValue(null),
    });

    await expect(client.subscribe(jest.fn())).rejects.toThrow(
      /Missing Cognito token/,
    );
  });

  it('reports errors through onError when the server sends type=error', async () => {
    const onError = jest.fn();
    const client = new AppSyncEventsClient({ ...baseConfig, onError });
    const listener = jest.fn();

    const subscribePromise = client.subscribe(listener);
    await Promise.resolve();
    await Promise.resolve();

    const ws = StubSocket.last!;
    ws.simulateOpen();
    ws.simulateMessage({ type: 'connection_ack' });
    ws.simulateMessage({ type: 'subscribe_success' });
    await subscribePromise;

    ws.simulateMessage({ type: 'error', errors: ['boom'] });
    expect(onError).toHaveBeenCalled();
    client.close();
  });

  it('reconnects after an unexpected close and fires onReconnect on re-subscribe', async () => {
    jest.useFakeTimers();
    try {
      const onReconnect = jest.fn();
      const client = new AppSyncEventsClient({ ...baseConfig, onReconnect });
      const listener = jest.fn();

      const subscribePromise = client.subscribe(listener);
      await Promise.resolve();
      await Promise.resolve();

      const ws1 = StubSocket.last!;
      await handshake(ws1);
      await subscribePromise;
      // First subscribe must NOT be treated as a reconnect.
      expect(onReconnect).not.toHaveBeenCalled();

      // The socket drops unexpectedly → client schedules a reconnect.
      ws1.simulateClose();
      jest.advanceTimersByTime(1000); // first backoff step
      await Promise.resolve();
      await Promise.resolve();

      const ws2 = StubSocket.last!;
      expect(ws2).not.toBe(ws1);
      await handshake(ws2);

      // A successful re-subscribe triggers the backfill hook exactly once.
      expect(onReconnect).toHaveBeenCalledTimes(1);

      client.close();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not reconnect after an intentional close()', async () => {
    jest.useFakeTimers();
    try {
      const client = new AppSyncEventsClient({ ...baseConfig });
      const subscribePromise = client.subscribe(jest.fn());
      await Promise.resolve();
      await Promise.resolve();

      const ws1 = StubSocket.last!;
      await handshake(ws1);
      await subscribePromise;

      client.close();
      ws1.simulateClose();
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // No new socket was created after an intentional close.
      expect(StubSocket.last).toBe(ws1);
    } finally {
      jest.useRealTimers();
    }
  });
});
