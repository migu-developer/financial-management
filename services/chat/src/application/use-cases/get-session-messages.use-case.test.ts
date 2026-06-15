import { GetSessionMessagesUseCase } from './get-session-messages.use-case';
import type { ChatMessage } from '@services/chat/domain/entities/chat-message';
import type { ChatSession } from '@services/chat/domain/entities/chat-session';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';
import { UnauthorizedError } from '@packages/models/shared/utils/errors';

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
  };
}

const UID = 'uid-1';

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

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    session_id: 'session-1',
    role: 'user',
    content: 'Hola',
    attachment_s3_key: null,
    attachment_type: null,
    expense_id: null,
    task_token: null,
    task_token_status: null,
    created_at: '2026-06-06T10:00:01Z',
    updated_at: '2026-06-06T10:00:01Z',
    created_by: 'u@test.com',
    modified_by: 'u@test.com',
  },
];

describe('GetSessionMessagesUseCase', () => {
  it('returns the session messages when the session belongs to the user', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    sessionRepo.findByIdAndUserUid.mockResolvedValue(mockSession);
    messageRepo.findRecentBySession.mockResolvedValue(mockMessages);

    const useCase = new GetSessionMessagesUseCase(sessionRepo, messageRepo);
    const result = await useCase.execute('session-1', UID);

    expect(result).toBe(mockMessages);
    expect(sessionRepo.findByIdAndUserUid).toHaveBeenCalledWith(
      'session-1',
      UID,
    );
    expect(messageRepo.findRecentBySession).toHaveBeenCalledWith(
      'session-1',
      UID,
      expect.any(Number),
    );
  });

  it('throws UnauthorizedError when the session does not belong to the user', async () => {
    const sessionRepo = makeMockSessionRepo();
    const messageRepo = makeMockMessageRepo();
    sessionRepo.findByIdAndUserUid.mockResolvedValue(null);

    const useCase = new GetSessionMessagesUseCase(sessionRepo, messageRepo);

    await expect(useCase.execute('stranger-session', UID)).rejects.toThrow(
      UnauthorizedError,
    );
    expect(messageRepo.findRecentBySession).not.toHaveBeenCalled();
  });
});
