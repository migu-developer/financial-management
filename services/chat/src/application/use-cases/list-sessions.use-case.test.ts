import { ListSessionsUseCase } from './list-sessions.use-case';
import type { ChatSessionRepository } from '@services/chat/domain/repositories/chat-session.repository';
import type { ChatSessionSummary } from '@services/chat/domain/entities/chat-session';

function makeMockSessionRepo(): jest.Mocked<ChatSessionRepository> {
  return {
    findByIdAndUserUid: jest.fn(),
    create: jest.fn(),
    touchLastMessage: jest.fn(),
    findByUser: jest.fn(),
  };
}

const UID = 'uid-1';

const summaries: ChatSessionSummary[] = [
  {
    id: 'session-2',
    started_at: '2026-06-10T10:00:00Z',
    last_message_at: '2026-06-12T10:00:00Z',
    preview: 'Gasté 50 en el super',
    message_count: 4,
  },
  {
    id: 'session-1',
    started_at: '2026-06-01T10:00:00Z',
    last_message_at: '2026-06-05T10:00:00Z',
    preview: '¿Cuánto gasté este mes?',
    message_count: 2,
  },
];

describe('ListSessionsUseCase', () => {
  it('returns the user sessions from the repository', async () => {
    const repo = makeMockSessionRepo();
    repo.findByUser.mockResolvedValue(summaries);
    const useCase = new ListSessionsUseCase(repo);

    const result = await useCase.execute(UID);

    expect(result).toBe(summaries);
    expect(repo.findByUser).toHaveBeenCalledWith(UID, expect.any(Number));
  });

  it('forwards an explicit limit', async () => {
    const repo = makeMockSessionRepo();
    repo.findByUser.mockResolvedValue([]);
    const useCase = new ListSessionsUseCase(repo);

    await useCase.execute(UID, 10);

    expect(repo.findByUser).toHaveBeenCalledWith(UID, 10);
  });
});
