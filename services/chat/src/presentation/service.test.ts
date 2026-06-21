import { ChatService } from './service';
import type { Application } from '@services/chat/presentation/application';
import type { MetricsService } from '@services/shared/domain/services/metrics';
import { SendMessageUseCase } from '@services/chat/application/use-cases/send-message.use-case';

// Repos hit Postgres in their methods; we mock the use case wholesale so the
// service test stays focused on metric emission and never touches a DB.
jest.mock(
  '@services/chat/infrastructure/repositories/postgres-chat-session.repository',
);
jest.mock(
  '@services/chat/infrastructure/repositories/postgres-chat-message.repository',
);
jest.mock('@services/chat/application/use-cases/send-message.use-case');

const MockSendMessageUseCase = SendMessageUseCase as jest.MockedClass<
  typeof SendMessageUseCase
>;

function makeMetrics(): jest.Mocked<MetricsService> {
  return {
    count: jest.fn(),
    durationMs: jest.fn(),
    publish: jest.fn(),
  };
}

function makeApp(
  metrics: MetricsService,
  body: Record<string, unknown> | null,
): Application {
  return {
    event: { body: body === null ? null : JSON.stringify(body) },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    user: { uid: 'uid-1', email: 'u@test.com' },
    dbService: {},
    metrics,
    workflowStarter: {},
    workflowCallback: {},
  } as unknown as Application;
}

const SUCCESS_RESULT = {
  session: { id: 'session-1' },
  userMessage: { id: 'msg-1' },
  execution: { executionArn: 'arn:exec' },
  supersededPreviews: 0,
};

describe('ChatService.executePOST metrics', () => {
  beforeEach(() => {
    MockSendMessageUseCase.mockReset();
  });

  it('emits ChatMessageReceived for a well-formed request', async () => {
    MockSendMessageUseCase.prototype.execute = jest
      .fn()
      .mockResolvedValue(SUCCESS_RESULT);
    const metrics = makeMetrics();
    const service = new ChatService(makeApp(metrics, { content: 'hola' }));

    await service.executePOST();

    expect(metrics.count).toHaveBeenCalledWith('ChatMessageReceived');
  });

  it('does not emit ChatMessageReceived when content is missing', async () => {
    const metrics = makeMetrics();
    const service = new ChatService(makeApp(metrics, { content: '' }));

    await expect(service.executePOST()).rejects.toThrow();
    expect(metrics.count).not.toHaveBeenCalledWith('ChatMessageReceived');
  });

  it('emits ChatPreviewSuperseded with the released count', async () => {
    MockSendMessageUseCase.prototype.execute = jest.fn().mockResolvedValue({
      ...SUCCESS_RESULT,
      supersededPreviews: 3,
    });
    const metrics = makeMetrics();
    const service = new ChatService(makeApp(metrics, { content: 'cambialo' }));

    await service.executePOST();

    expect(metrics.count).toHaveBeenCalledWith('ChatPreviewSuperseded', 3);
  });

  it('does not emit ChatPreviewSuperseded when nothing was released', async () => {
    MockSendMessageUseCase.prototype.execute = jest
      .fn()
      .mockResolvedValue(SUCCESS_RESULT);
    const metrics = makeMetrics();
    const service = new ChatService(makeApp(metrics, { content: 'hola' }));

    await service.executePOST();

    expect(metrics.count).not.toHaveBeenCalledWith(
      'ChatPreviewSuperseded',
      expect.anything(),
    );
  });

  it('emits ChatWorkflowStartFailure and rethrows when the use case fails', async () => {
    const boom = new Error('SFN down');
    MockSendMessageUseCase.prototype.execute = jest
      .fn()
      .mockRejectedValue(boom);
    const metrics = makeMetrics();
    const service = new ChatService(makeApp(metrics, { content: 'hola' }));

    await expect(service.executePOST()).rejects.toThrow('SFN down');
    expect(metrics.count).toHaveBeenCalledWith('ChatWorkflowStartFailure');
  });
});
