import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { UserFixture } from '@services/shared/test/fixtures/users.fixture';
import { PostgresUserRepository } from '@services/users/infrastructure/repositories/postgres-user.repository';

const dbService = new TestDatabaseService(
  process.env['DATABASE_URL']!,
  process.env['DATABASE_SCHEMA']!,
  process.env['TEST_RUN_ID']!,
);

let repo: PostgresUserRepository;
let userFixture: UserFixture;

beforeAll(async () => {
  await dbService.createSchema();
  repo = new PostgresUserRepository(dbService);
  userFixture = new UserFixture(dbService);
});

afterAll(async () => {
  await dbService.dropSchema();
  await dbService.end();
});

beforeEach(async () => {
  await dbService.truncate('expenses', 'users', 'audit_logs');
});

describe('PostgresUserRepository — integration', () => {
  describe('create', () => {
    it('creates a user and returns it with generated fields', async () => {
      const user = await repo.create(
        {
          uid: 'a0000000-0000-0000-0000-000000000001',
          email: 'new@test.com',
          first_name: 'New',
          last_name: 'User',
          locale: 'en',
        },
        'new@test.com',
      );

      expect(user.id).toBeDefined();
      expect(user.uid).toBe('a0000000-0000-0000-0000-000000000001');
      expect(user.email).toBe('new@test.com');
      expect(user.first_name).toBe('New');
      expect(user.last_name).toBe('User');
      expect(user.locale).toBe('en');
      expect(user.created_by).toBe('new@test.com');
      expect(user.created_at).toBeDefined();
    });

    it('creates a user with only required fields', async () => {
      const user = await repo.create(
        {
          uid: 'b0000000-0000-0000-0000-000000000002',
          email: 'minimal@test.com',
        },
        'minimal@test.com',
      );

      expect(user.uid).toBe('b0000000-0000-0000-0000-000000000002');
      expect(user.first_name).toBeNull();
      expect(user.last_name).toBeNull();
      expect(user.locale).toBeNull();
    });

    it('throws on duplicate uid', async () => {
      await repo.create(
        { uid: 'c0000000-0000-0000-0000-000000000003', email: 'dup1@test.com' },
        'dup1@test.com',
      );

      await expect(
        repo.create(
          {
            uid: 'c0000000-0000-0000-0000-000000000003',
            email: 'dup2@test.com',
          },
          'dup2@test.com',
        ),
      ).rejects.toThrow();
    });

    it('throws on duplicate email', async () => {
      await repo.create(
        { uid: 'd0000000-0000-0000-0000-000000000004', email: 'same@test.com' },
        'same@test.com',
      );

      await expect(
        repo.create(
          {
            uid: 'e0000000-0000-0000-0000-000000000005',
            email: 'same@test.com',
          },
          'same@test.com',
        ),
      ).rejects.toThrow();
    });
  });

  describe('findByUid', () => {
    it('returns user when uid matches', async () => {
      const inserted = await userFixture.insert();
      const found = await repo.findByUid(inserted.uid);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(inserted.id);
      expect(found!.email).toBe(inserted.email);
    });

    it('returns null when uid does not exist', async () => {
      const found = await repo.findByUid(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns user when email matches', async () => {
      const inserted = await userFixture.insert();
      const found = await repo.findByEmail(inserted.email);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(inserted.id);
      expect(found!.uid).toBe(inserted.uid);
    });

    it('returns null when email does not exist', async () => {
      const found = await repo.findByEmail('nonexistent@test.com');
      expect(found).toBeNull();
    });
  });

  describe('updateUid', () => {
    it('updates uid for existing email', async () => {
      const inserted = await userFixture.insert();
      const newUid = 'f0000000-0000-0000-0000-000000000099';

      const updated = await repo.updateUid(
        inserted.email,
        newUid,
        inserted.email,
      );

      expect(updated.uid).toBe(newUid);
      expect(updated.email).toBe(inserted.email);
      expect(updated.modified_by).toBe(inserted.email);
    });

    it('throws when email does not exist', async () => {
      await expect(
        repo.updateUid(
          'nonexistent@test.com',
          'f0000000-0000-0000-0000-000000000099',
          'ghost@test.com',
        ),
      ).rejects.toThrow();
    });

    it('preserves other fields after uid update', async () => {
      const inserted = await userFixture.insert();
      const newUid = 'f0000000-0000-0000-0000-000000000088';

      const updated = await repo.updateUid(
        inserted.email,
        newUid,
        inserted.email,
      );

      expect(updated.first_name).toBe(inserted.first_name);
      expect(updated.last_name).toBe(inserted.last_name);
      expect(updated.locale).toBe(inserted.locale);
    });
  });

  describe('patch', () => {
    it('updates only provided fields', async () => {
      const inserted = await userFixture.insert();

      const patched = await repo.patch(
        inserted.uid,
        { first_name: 'Patched', phone: '+573001234567' },
        inserted.email,
      );

      expect(patched.first_name).toBe('Patched');
      expect(patched.phone).toBe('+573001234567');
      expect(patched.last_name).toBe(inserted.last_name);
      expect(patched.modified_by).toBe(inserted.email);
    });

    it('throws when uid does not exist', async () => {
      await expect(
        repo.patch(
          '00000000-0000-0000-0000-000000000000',
          { first_name: 'Ghost' },
          'ghost@test.com',
        ),
      ).rejects.toThrow();
    });
  });
});
