import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { UserFixture } from '@services/shared/test/fixtures/users.fixture';
import type { TestUser } from '@services/shared/test/fixtures/users.fixture';
import { PostgresChatSessionRepository } from '@services/chat/infrastructure/repositories/postgres-chat-session.repository';
import { PostgresChatMessageRepository } from '@services/chat/infrastructure/repositories/postgres-chat-message.repository';
import type { ChatSession } from '@services/chat/domain/entities/chat-session';

const dbService = new TestDatabaseService(
  process.env['DATABASE_URL']!,
  process.env['DATABASE_SCHEMA']!,
  process.env['TEST_RUN_ID']!,
);

let sessionRepo: PostgresChatSessionRepository;
let repo: PostgresChatMessageRepository;
let userFixture: UserFixture;
let userA: TestUser;
let userB: TestUser;
let session: ChatSession;

beforeAll(async () => {
  await dbService.createSchema();
  sessionRepo = new PostgresChatSessionRepository(dbService);
  repo = new PostgresChatMessageRepository(dbService);
  userFixture = new UserFixture(dbService);
});

beforeEach(async () => {
  await dbService.truncate('chat_messages', 'chat_sessions', 'users');
  userA = await userFixture.insert();
  userB = await userFixture.insert();
  session = await sessionRepo.create({}, userA.uid, userA.email);
});

afterAll(async () => {
  await dbService.dropSchema();
  await dbService.end();
});

describe('PostgresChatMessageRepository — integration', () => {
  describe('create', () => {
    it('creates a user message with generated fields', async () => {
      const message = await repo.create(
        { session_id: session.id, role: 'user', content: 'Hola' },
        userA.email,
      );
      expect(message.id).toEqual(expect.any(String));
      expect(message.session_id).toBe(session.id);
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hola');
      expect(message.task_token).toBeNull();
    });

    it('creates an assistant message with a pending task token (HITL preview)', async () => {
      const message = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: '¿Confirmás?',
          task_token: 'token-123',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );
      expect(message.task_token).toBe('token-123');
      expect(message.task_token_status).toBe('pending');
    });

    it('rejects invalid roles (DB CHECK constraint)', async () => {
      await expect(
        repo.create(
          {
            session_id: session.id,
            role: 'robot' as never,
            content: 'x',
          },
          userA.email,
        ),
      ).rejects.toThrow();
    });
  });

  describe('findPendingByTaskToken', () => {
    it('finds a pending message by token for the owning user', async () => {
      const created = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview',
          task_token: 'tok-1',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );

      const found = await repo.findPendingByTaskToken('tok-1', userA.uid);
      expect(found?.id).toBe(created.id);
    });

    it('does NOT find the token for another user', async () => {
      await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview',
          task_token: 'tok-1',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );

      expect(await repo.findPendingByTaskToken('tok-1', userB.uid)).toBeNull();
    });

    it('does NOT find non-pending tokens', async () => {
      const created = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview',
          task_token: 'tok-1',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );
      await repo.updateTaskTokenStatus(
        created.id,
        userA.uid,
        'confirmed',
        userA.email,
      );

      expect(await repo.findPendingByTaskToken('tok-1', userA.uid)).toBeNull();
    });
  });

  describe('updateTaskTokenStatus', () => {
    it('updates the status for the owning user', async () => {
      const created = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview',
          task_token: 'tok-1',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );

      const updated = await repo.updateTaskTokenStatus(
        created.id,
        userA.uid,
        'cancelled',
        userA.email,
      );
      expect(updated.task_token_status).toBe('cancelled');
      expect(updated.modified_by).toBe(userA.email);
    });

    it('throws when another user tries to update', async () => {
      const created = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview',
          task_token: 'tok-1',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );

      await expect(
        repo.updateTaskTokenStatus(
          created.id,
          userB.uid,
          'confirmed',
          userB.email,
        ),
      ).rejects.toThrow('Failed to update chat message task token status');
    });

    it('only the first transition wins (guards against double-resume)', async () => {
      const created = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview',
          task_token: 'tok-1',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );

      // First caller transitions pending -> confirmed.
      const first = await repo.updateTaskTokenStatus(
        created.id,
        userA.uid,
        'confirmed',
        userA.email,
      );
      expect(first.task_token_status).toBe('confirmed');

      // Second caller finds the row no longer pending -> 0 rows -> throws,
      // so the use case never reaches a second SendTaskSuccess.
      await expect(
        repo.updateTaskTokenStatus(
          created.id,
          userA.uid,
          'cancelled',
          userA.email,
        ),
      ).rejects.toThrow('Failed to update chat message task token status');
    });
  });
});
