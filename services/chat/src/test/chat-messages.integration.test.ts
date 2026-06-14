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
  describe('findRecentBySession', () => {
    it('returns messages oldest → newest, scoped to the owning user', async () => {
      await repo.create(
        { session_id: session.id, role: 'user', content: 'primero' },
        userA.email,
      );
      await repo.create(
        { session_id: session.id, role: 'assistant', content: 'segundo' },
        userA.email,
      );
      await repo.create(
        { session_id: session.id, role: 'user', content: 'tercero' },
        userA.email,
      );

      const recent = await repo.findRecentBySession(session.id, userA.uid, 10);
      expect(recent.map((m) => m.content)).toEqual([
        'primero',
        'segundo',
        'tercero',
      ]);

      // Another user cannot read this session's history.
      expect(await repo.findRecentBySession(session.id, userB.uid, 10)).toEqual(
        [],
      );
    });

    it('keeps only the latest `limit` messages (still chronological)', async () => {
      for (const c of ['m1', 'm2', 'm3', 'm4']) {
        await repo.create(
          { session_id: session.id, role: 'user', content: c },
          userA.email,
        );
      }
      const recent = await repo.findRecentBySession(session.id, userA.uid, 2);
      expect(recent.map((m) => m.content)).toEqual(['m3', 'm4']);
    });
  });

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

  describe('findPendingPreviewsBySession', () => {
    it('returns only pending previews of the session (oldest → newest)', async () => {
      const first = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview 1',
          task_token: 'tok-1',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );
      const second = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview 2',
          task_token: 'tok-2',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );
      // A plain user message and an already-confirmed preview must be excluded.
      await repo.create(
        { session_id: session.id, role: 'user', content: 'hola' },
        userA.email,
      );
      const confirmed = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview confirmado',
          task_token: 'tok-3',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );
      await repo.updateTaskTokenStatus(
        confirmed.id,
        userA.uid,
        'confirmed',
        userA.email,
      );

      const pending = await repo.findPendingPreviewsBySession(
        session.id,
        userA.uid,
      );
      expect(pending.map((m) => m.id)).toEqual([first.id, second.id]);
    });

    it('does NOT return previews for another user', async () => {
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

      expect(
        await repo.findPendingPreviewsBySession(session.id, userB.uid),
      ).toEqual([]);
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
