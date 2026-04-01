import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TestDatabaseService } from '@services/shared/test/setup';
import { DocumentSeeder } from './fixtures/catalogs.fixture';
import { PostgresDocumentRepository } from '@services/documents/infrastructure/repositories/postgres-document.repository';

const dbService = new TestDatabaseService(
  process.env['DATABASE_URL']!,
  process.env['DATABASE_SCHEMA']!,
  process.env['TEST_RUN_ID']!,
);

let repo: PostgresDocumentRepository;

beforeAll(async () => {
  await dbService.createSchema();
  repo = new PostgresDocumentRepository(dbService);
  await new DocumentSeeder(dbService).seed();
});

afterAll(async () => {
  await dbService.dropSchema();
  await dbService.end();
});

describe('PostgresDocumentRepository — integration', () => {
  it('returns all documents', async () => {
    const documents = await repo.findAll();
    expect(documents).toHaveLength(4);
  });

  it('returns documents ordered by name ASC', async () => {
    const documents = await repo.findAll();
    const names = documents.map((d) => d.name);
    expect(names).toEqual(['CC', 'CE', 'NIT', 'Passport']);
  });

  it('each document has id and name', async () => {
    const documents = await repo.findAll();
    for (const d of documents) {
      expect(d.id).toBeDefined();
      expect(d.name).toBeDefined();
    }
  });
});
