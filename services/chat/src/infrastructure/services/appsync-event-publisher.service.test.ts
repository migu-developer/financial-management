import { AppSyncEventPublisher } from './appsync-event-publisher.service';

jest.mock('@aws-sdk/credential-provider-node', () => ({
  defaultProvider: jest.fn(
    () => async () =>
      Promise.resolve({
        accessKeyId: 'AKIA_TEST',
        secretAccessKey: 'secret',
      }),
  ),
}));

jest.mock('@aws-sdk/signature-v4', () => ({
  SignatureV4: jest.fn().mockImplementation(() => ({
    sign: jest.fn(async (request: { headers: Record<string, string> }) =>
      Promise.resolve({
        ...request,
        headers: { ...request.headers, authorization: 'AWS4-HMAC-SHA256 test' },
      }),
    ),
  })),
}));

import type { ChatEventPayload } from '@services/chat/domain/services/event-publisher.service';

const PAYLOAD: ChatEventPayload = {
  type: 'assistant_message',
  sessionId: 'sess-1',
  messageId: 'msg-1',
  content: 'hola',
};

describe('AppSyncEventPublisher', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('throws when the HTTP DNS is not configured', async () => {
    const publisher = new AppSyncEventPublisher('', 'us-east-1');
    await expect(
      publisher.publish('chat/u/responses', PAYLOAD),
    ).rejects.toThrow('APPSYNC_HTTP_DNS is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs the signed request to the /event endpoint', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const publisher = new AppSyncEventPublisher('api.example.com', 'us-east-1');

    await publisher.publish('chat/u/responses', PAYLOAD);

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('https://api.example.com/event');
    expect(init.method).toBe('POST');
    expect(init.headers['authorization']).toContain('AWS4-HMAC-SHA256');

    const body = JSON.parse(init.body) as {
      channel: string;
      events: string[];
    };
    expect(body.channel).toBe('chat/u/responses');
    expect(JSON.parse(body.events[0]!)).toEqual(PAYLOAD);
  });

  it('throws with status and body excerpt when AppSync rejects', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => Promise.resolve('Forbidden'),
    });
    const publisher = new AppSyncEventPublisher('api.example.com', 'us-east-1');

    await expect(
      publisher.publish('chat/u/responses', PAYLOAD),
    ).rejects.toThrow('AppSync publish failed (403): Forbidden');
  });
});
