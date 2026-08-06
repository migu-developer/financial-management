import { SaveAssistantMessageUseCase } from './save-assistant-message.use-case';
import type { ChatMessage } from '@services/chat/domain/entities/chat-message';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';
import type { EventPublisherService } from '@services/chat/domain/services/event-publisher.service';

function makeMessageRepo(): jest.Mocked<ChatMessageRepository> {
  return {
    create: jest.fn(),
    findRecentBySession: jest.fn(),
    findPendingByTaskToken: jest.fn(),
    findPendingPreviewsBySession: jest.fn().mockResolvedValue([]),
    updateTaskTokenStatus: jest.fn(),
    markExpired: jest.fn().mockResolvedValue(undefined),
    saveAttachmentExtraction: jest.fn().mockResolvedValue(undefined),
    findLatestUnusedExtraction: jest.fn().mockResolvedValue(null),
    linkExpenseToMessage: jest.fn().mockResolvedValue(undefined),
    findRecentForContext: jest.fn().mockResolvedValue([]),
  };
}

function makeSessionRepo(): jest.Mocked<ChatSessionRepository> {
  return {
    findByIdAndUserUid: jest.fn(),
    create: jest.fn(),
    touchLastMessage: jest.fn(),
    findByUser: jest.fn(),
  };
}

function makePublisher(): jest.Mocked<EventPublisherService> {
  return { publish: jest.fn() };
}

const mockMessage: ChatMessage = {
  id: 'msg-1',
  session_id: 'session-1',
  role: 'assistant',
  content: 'Listo!',
  attachment_s3_key: null,
  attachment_type: null,
  attachment_extraction: null,
  hidden_from_context: false,
  expense_id: null,
  task_token: null,
  task_token_status: null,
  created_at: '2026-06-15T10:00:00Z',
  updated_at: '2026-06-15T10:00:00Z',
  created_by: 'u@test.com',
  modified_by: 'u@test.com',
};

const channelTemplate = (uid: string) => `default/chat/${uid}/responses`;

describe('SaveAssistantMessageUseCase', () => {
  describe('regular assistant message', () => {
    it('persists the message with role=assistant and no task token', async () => {
      const sessionRepo = makeSessionRepo();
      const messageRepo = makeMessageRepo();
      const publisher = makePublisher();
      messageRepo.create.mockResolvedValue(mockMessage);

      const useCase = new SaveAssistantMessageUseCase(
        sessionRepo,
        messageRepo,
        publisher,
        channelTemplate,
      );

      await useCase.execute({
        sessionId: 'session-1',
        uid: 'uid-1',
        userEmail: 'u@test.com',
        content: 'Listo!',
      });

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'session-1',
          role: 'assistant',
          content: 'Listo!',
        }),
        'u@test.com',
      );
      const callArgs = messageRepo.create.mock.calls[0]?.[0] as unknown as
        | Record<string, unknown>
        | undefined;
      expect(callArgs?.['task_token']).toBeUndefined();
      expect(callArgs?.['task_token_status']).toBeUndefined();
    });

    it('publishes type=assistant_message', async () => {
      const sessionRepo = makeSessionRepo();
      const messageRepo = makeMessageRepo();
      const publisher = makePublisher();
      messageRepo.create.mockResolvedValue(mockMessage);

      const useCase = new SaveAssistantMessageUseCase(
        sessionRepo,
        messageRepo,
        publisher,
        channelTemplate,
      );

      await useCase.execute({
        sessionId: 'session-1',
        uid: 'uid-1',
        userEmail: 'u@test.com',
        content: 'Listo!',
      });

      expect(publisher.publish).toHaveBeenCalledWith(
        'default/chat/uid-1/responses',
        expect.objectContaining({
          type: 'assistant_message',
          sessionId: 'session-1',
          content: 'Listo!',
        }),
      );
    });

    it('includes expenseId in the payload when present', async () => {
      const sessionRepo = makeSessionRepo();
      const messageRepo = makeMessageRepo();
      const publisher = makePublisher();
      messageRepo.create.mockResolvedValue({
        ...mockMessage,
        expense_id: 'exp-1',
      });

      const useCase = new SaveAssistantMessageUseCase(
        sessionRepo,
        messageRepo,
        publisher,
        channelTemplate,
      );

      await useCase.execute({
        sessionId: 'session-1',
        uid: 'uid-1',
        userEmail: 'u@test.com',
        content: 'Gasto creado',
        expenseId: 'exp-1',
      });

      expect(publisher.publish).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ expenseId: 'exp-1' }),
      );
    });
  });

  describe('HITL preview message', () => {
    it('persists task_token and task_token_status=pending', async () => {
      const sessionRepo = makeSessionRepo();
      const messageRepo = makeMessageRepo();
      const publisher = makePublisher();
      messageRepo.create.mockResolvedValue({
        ...mockMessage,
        task_token: 'token-abc',
        task_token_status: 'pending',
      });

      const useCase = new SaveAssistantMessageUseCase(
        sessionRepo,
        messageRepo,
        publisher,
        channelTemplate,
      );

      await useCase.execute({
        sessionId: 'session-1',
        uid: 'uid-1',
        userEmail: 'u@test.com',
        content: 'Voy a registrar... ¿Confirmás?',
        taskToken: 'token-abc',
      });

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          task_token: 'token-abc',
          task_token_status: 'pending',
        }),
        'u@test.com',
      );
    });

    it('publishes type=preview_pending with the task token', async () => {
      const sessionRepo = makeSessionRepo();
      const messageRepo = makeMessageRepo();
      const publisher = makePublisher();
      messageRepo.create.mockResolvedValue({
        ...mockMessage,
        task_token: 'token-abc',
        task_token_status: 'pending',
      });

      const useCase = new SaveAssistantMessageUseCase(
        sessionRepo,
        messageRepo,
        publisher,
        channelTemplate,
      );

      await useCase.execute({
        sessionId: 'session-1',
        uid: 'uid-1',
        userEmail: 'u@test.com',
        content: '¿Confirmás?',
        taskToken: 'token-abc',
      });

      expect(publisher.publish).toHaveBeenCalledWith(
        'default/chat/uid-1/responses',
        expect.objectContaining({
          type: 'preview_pending',
          taskToken: 'token-abc',
        }),
      );
    });
  });

  describe('error event (catch-all)', () => {
    it('publishes type=error when eventType is overridden', async () => {
      const sessionRepo = makeSessionRepo();
      const messageRepo = makeMessageRepo();
      const publisher = makePublisher();
      messageRepo.create.mockResolvedValue(mockMessage);

      const useCase = new SaveAssistantMessageUseCase(
        sessionRepo,
        messageRepo,
        publisher,
        channelTemplate,
      );

      await useCase.execute({
        sessionId: 'session-1',
        uid: 'uid-1',
        userEmail: 'u@test.com',
        content: 'Uy, tuve un problema. ¿Lo intentamos de nuevo?',
        eventType: 'error',
      });

      expect(publisher.publish).toHaveBeenCalledWith(
        'default/chat/uid-1/responses',
        expect.objectContaining({
          type: 'error',
          sessionId: 'session-1',
        }),
      );
    });
  });

  it('refreshes the session last_message_at after persisting', async () => {
    const sessionRepo = makeSessionRepo();
    const messageRepo = makeMessageRepo();
    const publisher = makePublisher();
    messageRepo.create.mockResolvedValue(mockMessage);

    const useCase = new SaveAssistantMessageUseCase(
      sessionRepo,
      messageRepo,
      publisher,
      channelTemplate,
    );

    await useCase.execute({
      sessionId: 'session-1',
      uid: 'uid-1',
      userEmail: 'u@test.com',
      content: 'hi',
    });

    expect(sessionRepo.touchLastMessage).toHaveBeenCalledWith(
      'session-1',
      'uid-1',
    );
  });

  describe('retiring the receipt extraction', () => {
    it('links the USER message to the expense it produced', async () => {
      const messageRepo = makeMessageRepo();
      messageRepo.create.mockResolvedValue(mockMessage);

      await new SaveAssistantMessageUseCase(
        makeSessionRepo(),
        messageRepo,
        makePublisher(),
        channelTemplate,
      ).execute({
        sessionId: 'session-1',
        uid: 'uid-1',
        userEmail: 'u@test.com',
        content: 'listo',
        expenseId: 'expense-1',
        userMessageId: 'user-msg-1',
      });

      // THE BUG THIS FIXES: `expense_id` was only ever written on THIS assistant
      // message, never on the user message holding the receipt — so
      // findLatestUnusedExtraction could never see it as used, and the receipt
      // would be replayed into unrelated later messages of the session.
      expect(messageRepo.linkExpenseToMessage).toHaveBeenCalledWith(
        'user-msg-1',
        'uid-1',
        'expense-1',
        'u@test.com',
      );
    });

    it('does NOT link when no expense was created', async () => {
      const messageRepo = makeMessageRepo();
      messageRepo.create.mockResolvedValue(mockMessage);

      await new SaveAssistantMessageUseCase(
        makeSessionRepo(),
        messageRepo,
        makePublisher(),
        channelTemplate,
      ).execute({
        sessionId: 'session-1',
        uid: 'uid-1',
        userEmail: 'u@test.com',
        content: '¿En qué moneda?',
        userMessageId: 'user-msg-1',
      });

      // A clarification must leave the extraction replayable — that is the whole
      // point of storing it.
      expect(messageRepo.linkExpenseToMessage).not.toHaveBeenCalled();
    });

    it('still succeeds when the link fails, and reports it', async () => {
      const messageRepo = makeMessageRepo();
      messageRepo.create.mockResolvedValue(mockMessage);
      messageRepo.linkExpenseToMessage.mockRejectedValue(new Error('boom'));
      const onLinkFailure = jest.fn();

      const result = await new SaveAssistantMessageUseCase(
        makeSessionRepo(),
        messageRepo,
        makePublisher(),
        channelTemplate,
        onLinkFailure,
      ).execute({
        sessionId: 'session-1',
        uid: 'uid-1',
        userEmail: 'u@test.com',
        content: 'listo',
        expenseId: 'expense-1',
        userMessageId: 'user-msg-1',
      });

      // The expense already exists and the user has been told so: failing here
      // would turn a successful registration into an error message.
      expect(result.message).toBeDefined();
      expect(onLinkFailure).toHaveBeenCalled();
    });
  });
});
