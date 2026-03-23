import { setDbVersion } from './set-db-version';
import type { PoolClient } from 'pg';

function createMockClient() {
  return { query: jest.fn() } as unknown as jest.Mocked<PoolClient> & {
    query: jest.Mock;
  };
}

describe('setDbVersion', () => {
  it('inserts a migration record with all parameters', async () => {
    const client = createMockClient();

    await setDbVersion(client, '1.0.0', 'Initial schema', 150, 'abc123', true);

    expect(client.query).toHaveBeenCalledTimes(1);
    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO schema_migrations');
    expect(sql).toContain('$1, $2, $3, $4, $5');
    expect(params).toEqual(['1.0.0', 'Initial schema', 150, 'abc123', true]);
  });

  it('accepts null checksum for rollback records', async () => {
    const client = createMockClient();

    await setDbVersion(
      client,
      '1.0.0',
      'ROLLBACK: Initial schema',
      0,
      null,
      false,
    );

    const [, params] = client.query.mock.calls[0];
    expect(params).toEqual([
      '1.0.0',
      'ROLLBACK: Initial schema',
      0,
      null,
      false,
    ]);
  });

  it('inserts version, description, execution_time, checksum, success columns', async () => {
    const client = createMockClient();
    await setDbVersion(client, '2.1.0', 'Add column', 50, 'def456', true);

    const sql = client.query.mock.calls[0][0] as string;
    expect(sql).toContain('version');
    expect(sql).toContain('description');
    expect(sql).toContain('execution_time');
    expect(sql).toContain('checksum');
    expect(sql).toContain('success');
  });
});
