import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { UserFixture } from '@services/shared/test/fixtures/users.fixture';
import type { TestUser } from '@services/shared/test/fixtures/users.fixture';
import { PostgresChatSessionRepository } from '@services/chat/infrastructure/repositories/postgres-chat-session.repository';

const dbService = new TestDatabaseService(
  process.env['DATABASE_URL']!,
  process.env['DATABASE_SCHEMA']!,
  process.env['TEST_RUN_ID']!,
);

let repo: PostgresChatSessionRepository;
let userFixture: UserFixture;
let userA: TestUser;
let userB: TestUser;

beforeAll(async () => {
  await dbService.createSchema();
  repo = new PostgresChatSessionRepository(dbService);
  userFixture = new UserFixture(dbService);
});

beforeEach(async () => {
  await dbService.truncate('chat_messages', 'chat_sessions', 'users');
  userA = await userFixture.insert();
  userB = await userFixture.insert();
});

afterAll(async () => {
  await dbService.dropSchema();
  await dbService.end();
});

describe('PostgresChatSessionRepository — integration', () => {
  describe('create', () => {
    it('creates a session for the user resolved by Cognito uid', async () => {
      const session = await repo.create({}, userA.uid, userA.email);
      expect(session.id).toEqual(expect.any(String));
      expect(session.user_id).toBe(userA.id);
      expect(session.created_by).toBe(userA.email);
    });

    it('persists metadata as jsonb', async () => {
      const session = await repo.create(
        { metadata: { source: 'test' } },
        userA.uid,
        userA.email,
      );
      expect(session.metadata).toEqual({ source: 'test' });
    });

    it('throws when the uid does not exist', async () => {
      await expect(
        repo.create({}, '00000000-0000-0000-0000-000000000000', 'x@y.z'),
      ).rejects.toThrow('Failed to create chat session');
    });
  });

  describe('findByIdAndUserUid', () => {
    it('finds an owned session', async () => {
      const created = await repo.create({}, userA.uid, userA.email);
      const found = await repo.findByIdAndUserUid(created.id, userA.uid);
      expect(found?.id).toBe(created.id);
    });

    it("does NOT return another user's session", async () => {
      const created = await repo.create({}, userA.uid, userA.email);
      const found = await repo.findByIdAndUserUid(created.id, userB.uid);
      expect(found).toBeNull();
    });
  });

  describe('touchLastMessage', () => {
    it('bumps last_message_at for the owner', async () => {
      const created = await repo.create({}, userA.uid, userA.email);
      await dbService.query(
        `UPDATE financial_management.chat_sessions
         SET last_message_at = now() - interval '1 hour' WHERE id = $1`,
        [created.id],
      );

      await repo.touchLastMessage(created.id, userA.uid);

      const found = await repo.findByIdAndUserUid(created.id, userA.uid);
      const delta = Date.now() - new Date(found!.last_message_at).getTime();
      expect(delta).toBeLessThan(60_000);
    });

    it('does nothing when called by another user', async () => {
      const created = await repo.create({}, userA.uid, userA.email);
      await dbService.query(
        `UPDATE financial_management.chat_sessions
         SET last_message_at = now() - interval '1 hour' WHERE id = $1`,
        [created.id],
      );

      await repo.touchLastMessage(created.id, userB.uid);

      const found = await repo.findByIdAndUserUid(created.id, userA.uid);
      const delta = Date.now() - new Date(found!.last_message_at).getTime();
      expect(delta).toBeGreaterThan(60_000);
    });
  });

  describe('findByUser', () => {
    const insertMessage = async (
      sessionId: string,
      role: string,
      content: string,
    ) => {
      await dbService.query(
        `INSERT INTO financial_management.chat_messages
           (session_id, role, content, created_by, modified_by)
         VALUES ($1, $2, $3, 'test', 'test')`,
        [sessionId, role, content],
      );
    };

    it('lists sessions newest-activity-first with a first-user-message preview', async () => {
      const older = await repo.create({}, userA.uid, userA.email);
      await insertMessage(older.id, 'user', '¿Cuánto gasté este mes?');
      await dbService.query(
        `UPDATE financial_management.chat_sessions
         SET last_message_at = now() - interval '1 hour' WHERE id = $1`,
        [older.id],
      );

      const newer = await repo.create({}, userA.uid, userA.email);
      await insertMessage(newer.id, 'user', 'Gasté 50 en el super');
      await insertMessage(newer.id, 'assistant', 'Listo, lo registré');

      const sessions = await repo.findByUser(userA.uid, 50);

      expect(sessions.map((s) => s.id)).toEqual([newer.id, older.id]);
      expect(sessions[0]?.preview).toBe('Gasté 50 en el super');
      expect(sessions[0]?.message_count).toBe(2);
    });

    it('excludes empty sessions (no messages)', async () => {
      const empty = await repo.create({}, userA.uid, userA.email);
      const withMessage = await repo.create({}, userA.uid, userA.email);
      await insertMessage(withMessage.id, 'user', 'hola');

      const sessions = await repo.findByUser(userA.uid, 50);

      expect(sessions.map((s) => s.id)).toEqual([withMessage.id]);
      expect(sessions.map((s) => s.id)).not.toContain(empty.id);
    });

    it("does NOT return another user's sessions", async () => {
      const sessionB = await repo.create({}, userB.uid, userB.email);
      await insertMessage(sessionB.id, 'user', 'secreto');

      expect(await repo.findByUser(userA.uid, 50)).toEqual([]);
    });
  });
});
