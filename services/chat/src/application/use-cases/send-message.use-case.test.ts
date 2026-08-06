import { SendMessageUseCase } from './send-message.use-case';
import type { ChatMessage } from '@services/chat/domain/entities/chat-message';
import type { ChatSession } from '@services/chat/domain/entities/chat-session';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';
import type { WorkflowStarterService } from '@services/chat/domain/services/workflow-starter.service';
import type { WorkflowCallbackService } from '@services/chat/domain/services/workflow-callback.service';

function makeMockSessionRepo(): jest.Mocked<ChatSessionRepository> {
  return {
    findByIdAndUserUid: jest.fn(),
    create: jest.fn(),
    touchLastMessage: jest.fn(),
    findByUser: jest.fn(),
  };
}

function makeMockMessageRepo(): jest.Mocked<ChatMessageRepository> {
  return {
    create: jest.fn(),
    findRecentBySession: jest.fn().mockResolvedValue([]),
    findPendingByTaskToken: jest.fn(),
    findPendingPreviewsBySession: jest.fn().mockResolvedValue([]),
    updateTaskTokenStatus: jest.fn(),
    markExpired: jest.fn().mockResolvedValue(undefined),
    saveAttachmentExtraction: jest.fn().mockResolvedValue(undefined),
    findLatestUnusedExtraction: jest.fn().mockResolvedValue(null),
    linkExpenseToMessage: jest.fn().mockResolvedValue(undefined),
  };
}

function makeMockStarter(): jest.Mocked<WorkflowStarterService> {
  return {
    start: jest.fn(),
  };
}

function makeMockCallback(): jest.Mocked<WorkflowCallbackService> {
  return {
    resume: jest.fn().mockResolvedValue(undefined),
  };
}

const mockSession: ChatSession = {
  id: 'session-1',
  user_id: 'user-id-1',
  started_at: '2026-06-06T10:00:00Z',
  last_message_at: '2026-06-06T10:00:00Z',
  metadata: {},
  created_at: '2026-06-06T10:00:00Z',
  updated_at: '2026-06-06T10:00:00Z',
  created_by: 'u@test.com',
  modified_by: 'u@test.com',
};

const mockUserMessage: ChatMessage = {
  id: 'msg-1',
  session_id: 'session-1',
  role: 'user',
  content: 'Gasté $45 en la cena',
  attachment_s3_key: null,
  attachment_type: null,
  attachment_extraction: null,
  expense_id: null,
  task_token: null,
  task_token_status: null,
  created_at: '2026-06-06T10:00:01Z',
  updated_at: '2026-06-06T10:00:01Z',
  created_by: 'u@test.com',
  modified_by: 'u@test.com',
};

const mockExecution = {
  executionArn: 'arn:aws:states:us-east-1:123:execution:ChatProcess:abc',
  startDate: '2026-06-06T10:00:02Z',
};

const UID = 'uid-1';
const EMAIL = 'u@test.com';

describe('SendMessageUseCase', () => {
  describe('when no sessionId is provided', () => {
    it('creates a new session and persists the user message', async () => {
      const sessionRepo = makeMockSessionRepo();
      const messageRepo = makeMockMessageRepo();
      const starter = makeMockStarter();
      sessionRepo.create.mockResolvedValue(mockSession);
      messageRepo.create.mockResolvedValue(mockUserMessage);
      starter.start.mockResolvedValue(mockExecution);

      const useCase = new SendMessageUseCase(
        sessionRepo,
        messageRepo,
        starter,
        makeMockCallback(),
      );
      const result = await useCase.execute(
        { content: 'Gasté $45 en la cena' },
        UID,
        EMAIL,
      );

      expect(sessionRepo.create).toHaveBeenCalledWith({}, UID, EMAIL);
      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'session-1',
          role: 'user',
          content: 'Gasté $45 en la cena',
        }),
        EMAIL,
      );
      expect(result.session).toBe(mockSession);
      expect(result.userMessage).toBe(mockUserMessage);
    });
  });

  describe('when a sessionId is provided', () => {
    it('reuses the existing session', async () => {
      const sessionRepo = makeMockSessionRepo();
      const messageRepo = makeMockMessageRepo();
      const starter = makeMockStarter();
      sessionRepo.findByIdAndUserUid.mockResolvedValue(mockSession);
      messageRepo.create.mockResolvedValue(mockUserMessage);
      starter.start.mockResolvedValue(mockExecution);

      const useCase = new SendMessageUseCase(
        sessionRepo,
        messageRepo,
        starter,
        makeMockCallback(),
      );
      await useCase.execute(
        { sessionId: 'session-1', content: 'Another message' },
        UID,
        EMAIL,
      );

      expect(sessionRepo.findByIdAndUserUid).toHaveBeenCalledWith(
        'session-1',
        UID,
      );
      expect(sessionRepo.create).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedError if the session does not belong to the user', async () => {
      const sessionRepo = makeMockSessionRepo();
      const messageRepo = makeMockMessageRepo();
      const starter = makeMockStarter();
      sessionRepo.findByIdAndUserUid.mockResolvedValue(null);

      const useCase = new SendMessageUseCase(
        sessionRepo,
        messageRepo,
        starter,
        makeMockCallback(),
      );

      await expect(
        useCase.execute(
          { sessionId: 'stranger-session', content: 'Hi' },
          UID,
          EMAIL,
        ),
      ).rejects.toThrow();

      expect(messageRepo.create).not.toHaveBeenCalled();
      expect(starter.start).not.toHaveBeenCalled();
    });
  });

  it('refreshes the session last_message_at after persisting the message', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    const starter = makeMockStarter();
    sessionRepo.create.mockResolvedValue(mockSession);
    messageRepo.create.mockResolvedValue(mockUserMessage);
    starter.start.mockResolvedValue(mockExecution);

    const useCase = new SendMessageUseCase(
      sessionRepo,
      messageRepo,
      starter,
      makeMockCallback(),
    );
    await useCase.execute({ content: 'Hi' }, UID, EMAIL);

    expect(sessionRepo.touchLastMessage).toHaveBeenCalledWith('session-1', UID);
  });

  it('starts the Step Function with the message context', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    const starter = makeMockStarter();
    sessionRepo.create.mockResolvedValue(mockSession);
    messageRepo.create.mockResolvedValue(mockUserMessage);
    starter.start.mockResolvedValue(mockExecution);

    const useCase = new SendMessageUseCase(
      sessionRepo,
      messageRepo,
      starter,
      makeMockCallback(),
    );
    const result = await useCase.execute(
      { content: 'Gasté $45 en la cena' },
      UID,
      EMAIL,
    );

    expect(starter.start).toHaveBeenCalledWith({
      messageId: 'msg-1',
      sessionId: 'session-1',
      userId: UID,
      userEmail: EMAIL,
      content: 'Gasté $45 en la cena',
      history: '',
      // Always sent, even with nothing to replay: the ASL interpolates it
      // unconditionally and a missing path would raise States.Runtime.
      priorReceipt: '',
    });
    expect(result.execution).toEqual(mockExecution);
  });

  it('passes a formatted transcript of prior messages as history', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    const starter = makeMockStarter();
    sessionRepo.findByIdAndUserUid.mockResolvedValue(mockSession);
    messageRepo.create.mockResolvedValue(mockUserMessage);
    starter.start.mockResolvedValue(mockExecution);
    // Prior turns (oldest → newest), loaded BEFORE the current message.
    messageRepo.findRecentBySession.mockResolvedValue([
      {
        ...mockUserMessage,
        role: 'user',
        content: 'Quiero registrar un gasto de 25',
      },
      { ...mockUserMessage, role: 'assistant', content: '¿En qué moneda?' },
    ]);

    const useCase = new SendMessageUseCase(
      sessionRepo,
      messageRepo,
      starter,
      makeMockCallback(),
    );
    await useCase.execute(
      { sessionId: 'session-1', content: 'en COP' },
      UID,
      EMAIL,
    );

    // History is loaded for the session/user, before persisting the new message.
    expect(messageRepo.findRecentBySession).toHaveBeenCalledWith(
      'session-1',
      UID,
      expect.any(Number),
    );
    const startArg = starter.start.mock.calls[0]![0];
    expect(startArg.history).toBe(
      'Usuario: Quiero registrar un gasto de 25\nAsistente: ¿En qué moneda?',
    );
    expect(startArg.content).toBe('en COP');
  });

  it('forwards attachment metadata when present', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    const starter = makeMockStarter();
    sessionRepo.create.mockResolvedValue(mockSession);
    messageRepo.create.mockResolvedValue({
      ...mockUserMessage,
      attachment_s3_key: 'uploads/foo.jpg',
      attachment_type: 'image',
    });
    starter.start.mockResolvedValue(mockExecution);

    const useCase = new SendMessageUseCase(
      sessionRepo,
      messageRepo,
      starter,
      makeMockCallback(),
    );
    await useCase.execute(
      {
        content: 'Here is the receipt',
        attachmentS3Key: 'uploads/foo.jpg',
        attachmentType: 'image',
      },
      UID,
      EMAIL,
    );

    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        attachment_s3_key: 'uploads/foo.jpg',
        attachment_type: 'image',
      }),
      EMAIL,
    );
    expect(starter.start).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentS3Key: 'uploads/foo.jpg',
        attachmentType: 'image',
      }),
    );
  });

  describe('prior receipt context', () => {
    it('replays a stored extraction when the message has no attachment', async () => {
      const sessionRepo = makeMockSessionRepo();
      const messageRepo = makeMockMessageRepo();
      const starter = makeMockStarter();
      sessionRepo.create.mockResolvedValue(mockSession);
      messageRepo.create.mockResolvedValue(mockUserMessage);
      messageRepo.findLatestUnusedExtraction.mockResolvedValue({
        merchant: 'Crepes & Waffles',
        total: '48900',
        date: '2026-07-20',
      });
      starter.start.mockResolvedValue(mockExecution);

      await new SendMessageUseCase(
        sessionRepo,
        messageRepo,
        starter,
        makeMockCallback(),
      ).execute({ content: 'COP' }, UID, EMAIL);

      // THE FIX: without this the workflow would see only the word "COP" — no
      // amount, no merchant — and could never complete the expense the user was
      // answering about.
      const payload = starter.start.mock.calls[0]![0];
      expect(payload.priorReceipt).toContain('Crepes & Waffles');
      expect(payload.priorReceipt).toContain('48900');
      expect(payload.priorReceipt).toContain('anterior');
    });

    it('IGNORES a stored extraction when this message brings its own attachment', async () => {
      const sessionRepo = makeMockSessionRepo();
      const messageRepo = makeMockMessageRepo();
      const starter = makeMockStarter();
      sessionRepo.create.mockResolvedValue(mockSession);
      messageRepo.create.mockResolvedValue(mockUserMessage);
      starter.start.mockResolvedValue(mockExecution);

      await new SendMessageUseCase(
        sessionRepo,
        messageRepo,
        starter,
        makeMockCallback(),
      ).execute(
        {
          content: 'y este otro',
          attachmentS3Key: 'chat-ready/user/abc.jpg',
          attachmentType: 'image',
        },
        UID,
        EMAIL,
      );

      // Mixing a fresh photo with an older receipt would blend two purchases
      // into one expense, so the lookup must not even run.
      expect(messageRepo.findLatestUnusedExtraction).not.toHaveBeenCalled();
      expect(starter.start.mock.calls[0]![0].priorReceipt).toBe('');
    });

    it('sends an empty string when there is nothing stored', async () => {
      const sessionRepo = makeMockSessionRepo();
      const messageRepo = makeMockMessageRepo();
      const starter = makeMockStarter();
      sessionRepo.create.mockResolvedValue(mockSession);
      messageRepo.create.mockResolvedValue(mockUserMessage);
      messageRepo.findLatestUnusedExtraction.mockResolvedValue(null);
      starter.start.mockResolvedValue(mockExecution);

      await new SendMessageUseCase(
        sessionRepo,
        messageRepo,
        starter,
        makeMockCallback(),
      ).execute({ content: 'gasté 5000 en pan' }, UID, EMAIL);

      // ALWAYS present, never omitted: the state machine interpolates it with
      // States.Format, and a missing path raises States.Runtime — which would
      // kill the execution rather than degrade it.
      const payload = starter.start.mock.calls[0]![0];
      expect(payload.priorReceipt).toBe('');
      expect('priorReceipt' in payload).toBe(true);
    });

    it('scopes the lookup to the session and the caller', async () => {
      const sessionRepo = makeMockSessionRepo();
      const messageRepo = makeMockMessageRepo();
      const starter = makeMockStarter();
      sessionRepo.create.mockResolvedValue(mockSession);
      messageRepo.create.mockResolvedValue(mockUserMessage);
      starter.start.mockResolvedValue(mockExecution);

      await new SendMessageUseCase(
        sessionRepo,
        messageRepo,
        starter,
        makeMockCallback(),
      ).execute({ content: 'COP' }, UID, EMAIL);

      expect(messageRepo.findLatestUnusedExtraction).toHaveBeenCalledWith(
        mockSession.id,
        UID,
      );
    });
  });

  it('supersedes pending previews before starting the new workflow', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    const starter = makeMockStarter();
    const callback = makeMockCallback();
    sessionRepo.findByIdAndUserUid.mockResolvedValue(mockSession);
    messageRepo.create.mockResolvedValue(mockUserMessage);
    starter.start.mockResolvedValue(mockExecution);
    messageRepo.findPendingPreviewsBySession.mockResolvedValue([
      {
        ...mockUserMessage,
        id: 'preview-1',
        role: 'assistant',
        task_token: 'token-1',
        task_token_status: 'pending',
      },
    ]);
    messageRepo.updateTaskTokenStatus.mockResolvedValue({
      ...mockUserMessage,
      id: 'preview-1',
      task_token_status: 'superseded',
    });

    const useCase = new SendMessageUseCase(
      sessionRepo,
      messageRepo,
      starter,
      callback,
    );
    await useCase.execute(
      { sessionId: 'session-1', content: 'mejor que sean 50' },
      UID,
      EMAIL,
    );

    expect(messageRepo.updateTaskTokenStatus).toHaveBeenCalledWith(
      'preview-1',
      UID,
      'superseded',
      EMAIL,
    );
    expect(callback.resume).toHaveBeenCalledWith('token-1', {
      confirmed: false,
      superseded: true,
    });
    // The new workflow still starts after the old preview is released.
    expect(starter.start).toHaveBeenCalled();
  });

  it('returns the number of previews actually released', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    const starter = makeMockStarter();
    const callback = makeMockCallback();
    sessionRepo.findByIdAndUserUid.mockResolvedValue(mockSession);
    messageRepo.create.mockResolvedValue(mockUserMessage);
    starter.start.mockResolvedValue(mockExecution);
    messageRepo.findPendingPreviewsBySession.mockResolvedValue([
      {
        ...mockUserMessage,
        id: 'preview-1',
        role: 'assistant',
        task_token: 'token-1',
        task_token_status: 'pending',
      },
      {
        ...mockUserMessage,
        id: 'preview-2',
        role: 'assistant',
        task_token: 'token-2',
        task_token_status: 'pending',
      },
    ]);
    messageRepo.updateTaskTokenStatus.mockResolvedValue({
      ...mockUserMessage,
      task_token_status: 'superseded',
    });

    const useCase = new SendMessageUseCase(
      sessionRepo,
      messageRepo,
      starter,
      callback,
    );
    const result = await useCase.execute(
      { sessionId: 'session-1', content: 'cambialo' },
      UID,
      EMAIL,
    );

    expect(result.supersededPreviews).toBe(2);
  });

  it('reports zero superseded previews when none are pending', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    const starter = makeMockStarter();
    sessionRepo.create.mockResolvedValue(mockSession);
    messageRepo.create.mockResolvedValue(mockUserMessage);
    starter.start.mockResolvedValue(mockExecution);

    const useCase = new SendMessageUseCase(
      sessionRepo,
      messageRepo,
      starter,
      makeMockCallback(),
    );
    const result = await useCase.execute({ content: 'Hola' }, UID, EMAIL);

    expect(result.supersededPreviews).toBe(0);
  });

  it('does not count a preview whose release failed', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    const starter = makeMockStarter();
    const callback = makeMockCallback();
    sessionRepo.findByIdAndUserUid.mockResolvedValue(mockSession);
    messageRepo.create.mockResolvedValue(mockUserMessage);
    starter.start.mockResolvedValue(mockExecution);
    messageRepo.findPendingPreviewsBySession.mockResolvedValue([
      {
        ...mockUserMessage,
        id: 'preview-1',
        role: 'assistant',
        task_token: 'token-1',
        task_token_status: 'pending',
      },
    ]);
    messageRepo.updateTaskTokenStatus.mockRejectedValue(new Error('no rows'));

    const useCase = new SendMessageUseCase(
      sessionRepo,
      messageRepo,
      starter,
      callback,
    );
    const result = await useCase.execute(
      { sessionId: 'session-1', content: 'otra cosa' },
      UID,
      EMAIL,
    );

    expect(result.supersededPreviews).toBe(0);
  });

  it('still sends the message if releasing a stale preview fails', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    const starter = makeMockStarter();
    const callback = makeMockCallback();
    sessionRepo.findByIdAndUserUid.mockResolvedValue(mockSession);
    messageRepo.create.mockResolvedValue(mockUserMessage);
    starter.start.mockResolvedValue(mockExecution);
    messageRepo.findPendingPreviewsBySession.mockResolvedValue([
      {
        ...mockUserMessage,
        id: 'preview-1',
        role: 'assistant',
        task_token: 'token-1',
        task_token_status: 'pending',
      },
    ]);
    // A concurrent confirm already resolved the token: the guarded update
    // throws, but the new message must still go through.
    messageRepo.updateTaskTokenStatus.mockRejectedValue(new Error('no rows'));

    const useCase = new SendMessageUseCase(
      sessionRepo,
      messageRepo,
      starter,
      callback,
    );
    await useCase.execute(
      { sessionId: 'session-1', content: 'otra cosa' },
      UID,
      EMAIL,
    );

    expect(callback.resume).not.toHaveBeenCalled();
    expect(starter.start).toHaveBeenCalled();
  });
});
