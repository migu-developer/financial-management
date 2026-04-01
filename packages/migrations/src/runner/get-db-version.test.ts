import { ensureMigrationsTable, getDbVersion } from './get-db-version';
import type { PoolClient } from 'pg';

function createMockClient() {
  return { query: jest.fn() } as unknown as jest.Mocked<PoolClient> & {
    query: jest.Mock;
  };
}

describe('get-db-version', () => {
  describe('ensureMigrationsTable', () => {
    it('executes the CREATE TABLE IF NOT EXISTS statement', async () => {
      const client = createMockClient();
      await ensureMigrationsTable(client);

      expect(client.query).toHaveBeenCalledTimes(1);
      const sql = client.query.mock.calls[0][0] as string;
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
      expect(sql).toContain('version');
      expect(sql).toContain('description');
      expect(sql).toContain('executed_at');
      expect(sql).toContain('execution_time');
      expect(sql).toContain('checksum');
      expect(sql).toContain('success');
    });
  });

  describe('getDbVersion', () => {
    it('returns the latest successful version', async () => {
      const client = createMockClient();
      client.query.mockResolvedValue({
        rows: [{ version: '1.2.3' }],
      });

      const result = await getDbVersion(client);
      expect(result).toBe('1.2.3');
    });

    it('returns null when no migrations have been run', async () => {
      const client = createMockClient();
      client.query.mockResolvedValue({ rows: [] });

      const result = await getDbVersion(client);
      expect(result).toBeNull();
    });

    it('queries with success = true and ORDER BY executed_at DESC', async () => {
      const client = createMockClient();
      client.query.mockResolvedValue({ rows: [] });

      await getDbVersion(client);
      const sql = client.query.mock.calls[0][0] as string;
      expect(sql).toContain('WHERE success = true');
      expect(sql).toContain('ORDER BY executed_at DESC');
      expect(sql).toContain('LIMIT 1');
    });
  });
});
