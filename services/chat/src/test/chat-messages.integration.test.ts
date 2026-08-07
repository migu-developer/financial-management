import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { UserFixture } from '@services/shared/test/fixtures/users.fixture';
import type { TestUser } from '@services/shared/test/fixtures/users.fixture';
import { PostgresChatSessionRepository } from '@services/chat/infrastructure/repositories/postgres-chat-session.repository';
import { PostgresChatMessageRepository } from '@services/chat/infrastructure/repositories/postgres-chat-message.repository';
import { seedAllCatalogs } from '@services/chat/test/fixtures/catalogs.fixture';
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

  describe('saveAttachmentExtraction / findLatestUnusedExtraction', () => {
    const EXTRACTION = {
      merchant: 'Crepes & Waffles',
      total: '48900',
      date: '2026-07-20',
      confidence: 96.4,
    };

    /**
     * Creates a real expense row.
     *
     * `expense_id` has a foreign key, so a random uuid cannot exercise the
     * "already used" guard at all. Catalogs are NOT truncated between tests
     * (only chat_messages/chat_sessions/users are), so seeding unconditionally
     * would violate `expenses_types_name_key` on the second call.
     */
    const createExpense = async (): Promise<string> => {
      const existing = await dbService.query<{ id: string }>(
        `SELECT id FROM ${process.env['DATABASE_SCHEMA']}.currencies LIMIT 1`,
      );
      if (existing.length === 0) await seedAllCatalogs(dbService);

      const [currency] = await dbService.query<{ id: string }>(
        `SELECT id FROM ${process.env['DATABASE_SCHEMA']}.currencies LIMIT 1`,
      );
      const [type] = await dbService.query<{ id: string }>(
        `SELECT id FROM ${process.env['DATABASE_SCHEMA']}.expenses_types LIMIT 1`,
      );
      const [expense] = await dbService.query<{ id: string }>(
        `INSERT INTO ${process.env['DATABASE_SCHEMA']}.expenses
           (user_id, name, value, currency_id, expense_type_id)
         VALUES ($1, 'Recibo', 48900, $2, $3)
         RETURNING id`,
        [userA.id, currency!.id, type!.id],
      );
      return expense!.id;
    };

    const insertWithAttachment = async () =>
      repo.create(
        {
          session_id: session.id,
          role: 'user',
          content: 'este recibo',
          attachment_s3_key: `chat-ready/${userA.uid}/abc.jpg`,
          attachment_type: 'image',
        },
        userA.email,
      );

    it('stores an extraction and reads it back', async () => {
      const message = await insertWithAttachment();

      await repo.saveAttachmentExtraction(
        message.id,
        userA.uid,
        EXTRACTION,
        userA.email,
      );

      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toEqual(EXTRACTION);
    });

    it('returns null when the session has none', async () => {
      await insertWithAttachment();
      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toBeNull();
    });

    it('returns the MOST RECENT extraction', async () => {
      const first = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        first.id,
        userA.uid,
        { merchant: 'Viejo' },
        userA.email,
      );
      const second = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        second.id,
        userA.uid,
        { merchant: 'Nuevo' },
        userA.email,
      );

      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toEqual({ merchant: 'Nuevo' });
    });

    it('SKIPS an extraction whose message already produced an expense', async () => {
      const message = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        message.id,
        userA.uid,
        EXTRACTION,
        userA.email,
      );

      // Once the receipt became an expense it is history. Replaying it into a
      // later unrelated message would invent an expense the user never
      // described, so `expense_id IS NULL` is load-bearing, not tidiness.
      //
      // A REAL expense row, not a random uuid: `expense_id` has a foreign key,
      // so a made-up value cannot exercise this path at all.
      const expenseId = await createExpense();
      await dbService.query(
        `UPDATE ${process.env['DATABASE_SCHEMA']}.chat_messages
         SET expense_id = $2 WHERE id = $1`,
        [message.id, expenseId],
      );

      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toBeNull();
    });

    it('linkExpenseToMessage retires the extraction from replay', async () => {
      const message = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        message.id,
        userA.uid,
        EXTRACTION,
        userA.email,
      );
      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toEqual(EXTRACTION);

      const expenseId = await createExpense();

      await repo.linkExpenseToMessage(
        message.id,
        userA.uid,
        expenseId,
        userA.email,
      );

      // END-TO-END of the guard: production only ever stamped `expense_id` on
      // the ASSISTANT confirmation, so without this call the extraction stayed
      // replayable forever and would be merged into unrelated later messages.
      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toBeNull();
    });

    it("linkExpenseToMessage does NOT touch another user's message", async () => {
      const message = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        message.id,
        userA.uid,
        EXTRACTION,
        userA.email,
      );
      const expenseId = await createExpense();

      await repo.linkExpenseToMessage(
        message.id,
        userB.uid,
        expenseId,
        userB.email,
      );

      // Matches no row, so userA's extraction is still replayable.
      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toEqual(EXTRACTION);
    });

    it('a NEWER photo supersedes an older abandoned one', async () => {
      const first = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        first.id,
        userA.uid,
        { merchant: 'IMAGEN_A' },
        userA.email,
      );
      const second = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        second.id,
        userA.uid,
        { merchant: 'IMAGEN_B' },
        userA.email,
      );

      const found = await repo.findLatestUnusedExtraction(
        session.id,
        userA.uid,
      );
      expect(found!.merchant).toBe('IMAGEN_B');
    });

    it('an abandoned older extraction does NOT resurface once the newer one is used', async () => {
      const first = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        first.id,
        userA.uid,
        { merchant: 'IMAGEN_A' },
        userA.email,
      );
      const second = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        second.id,
        userA.uid,
        { merchant: 'IMAGEN_B' },
        userA.email,
      );
      await repo.linkExpenseToMessage(
        second.id,
        userA.uid,
        await createExpense(),
        userA.email,
      );

      // REGRESSION, proven against the real database before the fix: with
      // "newest UNUSED", retiring B made A the newest unused again, so the
      // abandoned first photo resurfaced and would have been merged into an
      // unrelated later message. The lookup now inspects the NEWEST extraction
      // regardless of expense_id and stops there.
      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toBeNull();
    });

    it("does NOT read another user's extraction", async () => {
      const message = await insertWithAttachment();
      await repo.saveAttachmentExtraction(
        message.id,
        userA.uid,
        EXTRACTION,
        userA.email,
      );

      await expect(
        repo.findLatestUnusedExtraction(session.id, userB.uid),
      ).resolves.toBeNull();
    });

    it("does NOT write to another user's message", async () => {
      const message = await insertWithAttachment();

      await repo.saveAttachmentExtraction(
        message.id,
        userB.uid,
        EXTRACTION,
        userB.email,
      );

      // The UPDATE simply matches no row — no throw, nothing written.
      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toBeNull();
    });

    it('writes nothing for a message with no attachment', async () => {
      const plain = await repo.create(
        { session_id: session.id, role: 'user', content: 'sin foto' },
        userA.email,
      );

      // The `attachment_s3_key IS NOT NULL` guard mirrors the table CHECK, so a
      // wrong messageId is a no-op instead of a constraint violation the caller
      // would have to interpret.
      await expect(
        repo.saveAttachmentExtraction(
          plain.id,
          userA.uid,
          EXTRACTION,
          userA.email,
        ),
      ).resolves.toBeUndefined();

      await expect(
        repo.findLatestUnusedExtraction(session.id, userA.uid),
      ).resolves.toBeNull();
    });

    it('rejects an extraction on a message with no attachment (DB CHECK)', async () => {
      const plain = await repo.create(
        { session_id: session.id, role: 'user', content: 'sin foto' },
        userA.email,
      );

      // Bypassing the repository guard must still be refused by the database.
      await expect(
        dbService.query(
          `UPDATE ${process.env['DATABASE_SCHEMA']}.chat_messages
           SET attachment_extraction = '{"total":"1"}'::jsonb WHERE id = $1`,
          [plain.id],
        ),
      ).rejects.toThrow(/chk_chat_messages_extraction_needs_attachment/);
    });
  });

  describe('findRecentForContext', () => {
    it('omits replies flagged hidden_from_context but keeps the rest', async () => {
      await repo.create(
        { session_id: session.id, role: 'user', content: 'mira este recibo' },
        userA.email,
      );
      await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'Uy, tuve un problema procesando tu mensaje.',
          hidden_from_context: true,
        },
        userA.email,
      );
      await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: '¿En qué moneda fue el gasto?',
        },
        userA.email,
      );

      const context = await repo.findRecentForContext(
        session.id,
        userA.uid,
        10,
      );

      // The clarification MUST stay: it is the question the next message answers.
      expect(context.map((m) => m.content)).toEqual([
        'mira este recibo',
        '¿En qué moneda fue el gasto?',
      ]);
    });

    it('still returns everything to findRecentBySession (the UI path)', async () => {
      await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'Uy, tuve un problema procesando tu mensaje.',
          hidden_from_context: true,
        },
        userA.email,
      );

      // Hiding it from the model must NOT hide it from the user.
      const restored = await repo.findRecentBySession(
        session.id,
        userA.uid,
        10,
      );
      expect(restored).toHaveLength(1);
      expect(restored[0]!.hidden_from_context).toBe(true);
    });

    it('defaults hidden_from_context to false', async () => {
      const message = await repo.create(
        { session_id: session.id, role: 'user', content: 'gasté 5000' },
        userA.email,
      );
      expect(message.hidden_from_context).toBe(false);
    });
  });

  describe('markExpired', () => {
    it('forces a pending preview to expired regardless of guard', async () => {
      const created = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview',
          task_token: 'tok-exp',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );

      await repo.markExpired(created.id, userA.uid, userA.email);

      const [row] = await repo.findRecentBySession(session.id, userA.uid, 10);
      expect(row?.task_token_status).toBe('expired');
      expect(row?.modified_by).toBe(userA.email);
    });

    it('does NOT expire a message owned by another user', async () => {
      const created = await repo.create(
        {
          session_id: session.id,
          role: 'assistant',
          content: 'preview',
          task_token: 'tok-exp',
          task_token_status: 'pending',
        },
        'chat-workflow',
      );

      await repo.markExpired(created.id, userB.uid, userB.email);

      // Still pending — the UPDATE matched no row for userB.
      expect(
        await repo.findPendingByTaskToken('tok-exp', userA.uid),
      ).not.toBeNull();
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
