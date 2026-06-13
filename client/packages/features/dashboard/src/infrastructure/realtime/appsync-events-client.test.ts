import { AppSyncEventsClient } from './appsync-events-client';
import type { ChatEvent } from '@features/dashboard/domain/services/chat-event';

/**
 * In-memory WebSocket stub. Lets the test drive `onopen` / `onmessage`
 * to simulate the AppSync Events handshake.
 */
class StubSocket {
  static last: StubSocket | undefined;
  url: string;
  protocols?: string;
  onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
  onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null;
  sent: string[] = [];

  constructor(url: string | URL, protocols?: string) {
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
    expect(ws.protocols).toBe('aws-appsync-event-ws');

    ws.simulateOpen();
    expect(JSON.parse(ws.sent[0]!)).toEqual({ type: 'connection_init' });

    ws.simulateMessage({ type: 'connection_ack' });
    const subscribeMsg = JSON.parse(ws.sent[1]!) as Record<string, unknown>;
    expect(subscribeMsg.type).toBe('subscribe');
    expect(subscribeMsg.channel).toBe('/chat/user-1/responses');
    expect(subscribeMsg.authorization).toEqual(
      expect.objectContaining({ authorization: 'mock-id-token' }),
    );

    ws.simulateMessage({ type: 'subscribe_success' });
    await expect(subscribePromise).resolves.toBeUndefined();
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
  });
});
