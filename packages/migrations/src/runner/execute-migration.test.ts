import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { executeMigrations, rollbackLast } from './execute-migration';
import type { DatabaseConfig } from 'src/interfaces/database';
import type { Pool } from 'pg';

jest.mock('src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    migration: jest.fn(),
    divider: jest.fn(),
  },
}));

function createMockClient() {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
}

function createMockPool(client: ReturnType<typeof createMockClient>) {
  return { connect: jest.fn().mockResolvedValue(client) } as unknown as Pool;
}

function createMigration(
  baseDir: string,
  major: number,
  minor: number,
  patch: number,
  description: string,
  upSql: string,
  downSql: string,
): void {
  const dir = path.join(baseDir, String(major), String(minor), String(patch));
  fs.mkdirSync(dir, { recursive: true });
  const slug = description.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  fs.writeFileSync(
    path.join(dir, 'version.ts'),
    `module.exports = {
      description: '${description}',
      scripts: [{ type: 'sql', up: '1_up_${slug}', down: '1_down_${slug}' }],
    };`,
  );
  fs.writeFileSync(path.join(dir, `1_up_${slug}.sql`), upSql);
  fs.writeFileSync(path.join(dir, `1_down_${slug}.sql`), downSql);
}

function getLogger() {
  return jest.requireMock<{ logger: Record<string, jest.Mock> }>(
    'src/lib/logger',
  ).logger;
}

const dbConfig: DatabaseConfig = {
  connectionString: 'postgresql://localhost:5432/test',
  schema: 'financial_management',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('executeMigrations', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('warns when no migrations exist', async () => {
    const client = createMockClient();
    const pool = createMockPool(client);

    await executeMigrations(pool, dbConfig, tmpDir);

    expect(getLogger().warn).toHaveBeenCalledWith('No migrations found');
    expect(client.release).toHaveBeenCalled();
  });

  it('reports up to date when current version matches latest', async () => {
    createMigration(tmpDir, 1, 0, 0, 'Initial', 'SELECT 1;', 'SELECT 2;');

    const client = createMockClient();
    client.query.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('SELECT version FROM')) {
        return { rows: [{ version: '1.0.0' }] };
      }
      return { rows: [] };
    });

    const pool = createMockPool(client);
    await executeMigrations(pool, dbConfig, tmpDir);

    expect(getLogger().success).toHaveBeenCalledWith(
      expect.stringContaining('up to date'),
    );
  });

  it('applies pending migrations with BEGIN/COMMIT', async () => {
    createMigration(
      tmpDir,
      1,
      0,
      0,
      'Create tables',
      'CREATE TABLE t(id int);',
      'DROP TABLE t;',
    );

    const client = createMockClient();
    const pool = createMockPool(client);
    await executeMigrations(pool, dbConfig, tmpDir);

    const queries = client.query.mock.calls.map((c: unknown[]) => {
      const arg = c[0];
      return typeof arg === 'string'
        ? arg.trim().substring(0, 30)
        : 'parameterized';
    });

    expect(queries).toContain('BEGIN');
    expect(queries).toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('applies multiple migrations in order', async () => {
    createMigration(tmpDir, 1, 0, 0, 'First', 'SELECT 1;', 'SELECT 2;');
    createMigration(tmpDir, 1, 0, 1, 'Second', 'SELECT 3;', 'SELECT 4;');

    const client = createMockClient();
    const pool = createMockPool(client);
    await executeMigrations(pool, dbConfig, tmpDir);

    const calls = getLogger().migration!.mock.calls;
    expect(calls[0]![0]).toBe('1.0.0');
    expect(calls[1]![0]).toBe('1.0.1');
  });

  it('applies only up to the target version', async () => {
    createMigration(tmpDir, 1, 0, 0, 'First', 'SELECT 1;', 'SELECT 2;');
    createMigration(tmpDir, 1, 0, 1, 'Second', 'SELECT 3;', 'SELECT 4;');
    createMigration(tmpDir, 1, 1, 0, 'Third', 'SELECT 5;', 'SELECT 6;');

    const client = createMockClient();
    const pool = createMockPool(client);
    await executeMigrations(pool, dbConfig, tmpDir, { targetVersion: '1.0.1' });

    const calls = getLogger().migration!.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]![0]).toBe('1.0.0');
    expect(calls[1]![0]).toBe('1.0.1');
  });

  it('rolls back on script failure', async () => {
    createMigration(tmpDir, 1, 0, 0, 'Broken', 'INVALID SQL;', 'SELECT 1;');

    const client = createMockClient();
    client.query.mockImplementation(async (sql: string) => {
      if (sql === 'INVALID SQL;') throw new Error('syntax error');
      return { rows: [] };
    });

    const pool = createMockPool(client);
    await expect(executeMigrations(pool, dbConfig, tmpDir)).rejects.toThrow(
      'syntax error',
    );

    const queries = client.query.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'string' ? c[0].trim() : '',
    );
    expect(queries).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('always releases the client even on error', async () => {
    createMigration(tmpDir, 1, 0, 0, 'Broken', 'FAIL;', 'SELECT 1;');

    const client = createMockClient();
    client.query.mockImplementation(async (sql: string) => {
      if (sql === 'FAIL;') throw new Error('fail');
      return { rows: [] };
    });

    const pool = createMockPool(client);
    await expect(executeMigrations(pool, dbConfig, tmpDir)).rejects.toThrow();
    expect(client.release).toHaveBeenCalled();
  });

  describe('--once flag', () => {
    it('applies only the next pending migration when once is true', async () => {
      createMigration(tmpDir, 1, 0, 0, 'First', 'SELECT 1;', 'SELECT 2;');
      createMigration(tmpDir, 1, 0, 1, 'Second', 'SELECT 3;', 'SELECT 4;');
      createMigration(tmpDir, 1, 0, 2, 'Third', 'SELECT 5;', 'SELECT 6;');

      const client = createMockClient();
      const pool = createMockPool(client);
      await executeMigrations(pool, dbConfig, tmpDir, { once: true });

      const calls = getLogger().migration!.mock.calls;
      expect(calls).toHaveLength(1);
      expect(calls[0]![0]).toBe('1.0.0');
    });

    it('applies all pending migrations when once is false', async () => {
      createMigration(tmpDir, 1, 0, 0, 'First', 'SELECT 1;', 'SELECT 2;');
      createMigration(tmpDir, 1, 0, 1, 'Second', 'SELECT 3;', 'SELECT 4;');

      const client = createMockClient();
      const pool = createMockPool(client);
      await executeMigrations(pool, dbConfig, tmpDir, { once: false });

      const calls = getLogger().migration!.mock.calls;
      expect(calls).toHaveLength(2);
    });

    it('shows --once indicator in log output', async () => {
      createMigration(tmpDir, 1, 0, 0, 'First', 'SELECT 1;', 'SELECT 2;');
      createMigration(tmpDir, 1, 0, 1, 'Second', 'SELECT 3;', 'SELECT 4;');

      const client = createMockClient();
      const pool = createMockPool(client);
      await executeMigrations(pool, dbConfig, tmpDir, { once: true });

      expect(getLogger().info).toHaveBeenCalledWith(
        expect.stringContaining('--once'),
      );
    });
  });
});

describe('rollbackLast', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rollback-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('warns when there are no migrations to rollback', async () => {
    const client = createMockClient();
    const pool = createMockPool(client);

    await rollbackLast(pool, dbConfig, tmpDir);

    expect(getLogger().warn).toHaveBeenCalledWith('No migrations to rollback');
  });

  it('executes down scripts in reverse order with BEGIN/COMMIT', async () => {
    createMigration(
      tmpDir,
      1,
      0,
      0,
      'Tables',
      'CREATE TABLE t(id int);',
      'DROP TABLE t;',
    );

    const client = createMockClient();
    client.query.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('SELECT version FROM')) {
        return { rows: [{ version: '1.0.0' }] };
      }
      return { rows: [] };
    });

    const pool = createMockPool(client);
    await rollbackLast(pool, dbConfig, tmpDir);

    const queries = client.query.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'string' ? c[0].trim().substring(0, 30) : 'parameterized',
    );

    expect(queries).toContain('BEGIN');
    expect(queries).toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('logs error when version not found in migrations directory', async () => {
    const client = createMockClient();
    client.query.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('SELECT version FROM')) {
        return { rows: [{ version: '9.9.9' }] };
      }
      return { rows: [] };
    });

    const pool = createMockPool(client);
    await rollbackLast(pool, dbConfig, tmpDir);

    expect(getLogger().error).toHaveBeenCalledWith(
      expect.stringContaining('9.9.9 not found'),
    );
  });

  it('rolls back transaction on down script failure', async () => {
    createMigration(tmpDir, 1, 0, 0, 'Tables', 'SELECT 1;', 'BROKEN;');

    const client = createMockClient();
    client.query.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('SELECT version FROM')) {
        return { rows: [{ version: '1.0.0' }] };
      }
      if (sql === 'BROKEN;') throw new Error('down failed');
      return { rows: [] };
    });

    const pool = createMockPool(client);
    await expect(rollbackLast(pool, dbConfig, tmpDir)).rejects.toThrow(
      'down failed',
    );

    const queries = client.query.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'string' ? c[0].trim() : '',
    );
    expect(queries).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  describe('cross-major protection', () => {
    it('throws error when rollback would cross major version boundary', async () => {
      createMigration(tmpDir, 1, 0, 0, 'V1', 'SELECT 1;', 'SELECT 2;');
      createMigration(tmpDir, 2, 0, 0, 'V2', 'SELECT 3;', 'SELECT 4;');

      const client = createMockClient();
      client.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('SELECT version FROM')) {
          return { rows: [{ version: '2.0.0' }] };
        }
        return { rows: [] };
      });

      const pool = createMockPool(client);
      await expect(rollbackLast(pool, dbConfig, tmpDir)).rejects.toThrow(
        'Cannot rollback 2.0.0: would cross major version boundary',
      );
    });

    it('includes --force hint in cross-major error message', async () => {
      createMigration(tmpDir, 1, 0, 0, 'V1', 'SELECT 1;', 'SELECT 2;');
      createMigration(tmpDir, 2, 0, 0, 'V2', 'SELECT 3;', 'SELECT 4;');

      const client = createMockClient();
      client.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('SELECT version FROM')) {
          return { rows: [{ version: '2.0.0' }] };
        }
        return { rows: [] };
      });

      const pool = createMockPool(client);
      await expect(rollbackLast(pool, dbConfig, tmpDir)).rejects.toThrow(
        'Use --force to override',
      );
    });

    it('allows cross-major rollback with force flag', async () => {
      createMigration(tmpDir, 1, 0, 0, 'V1', 'SELECT 1;', 'SELECT 2;');
      createMigration(tmpDir, 2, 0, 0, 'V2', 'SELECT 3;', 'SELECT 4;');

      const client = createMockClient();
      client.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('SELECT version FROM')) {
          return { rows: [{ version: '2.0.0' }] };
        }
        return { rows: [] };
      });

      const pool = createMockPool(client);
      await rollbackLast(pool, dbConfig, tmpDir, { force: true });

      expect(getLogger().success).toHaveBeenCalledWith('Rolled back 2.0.0');
    });

    it('allows rollback within same major version', async () => {
      createMigration(tmpDir, 1, 0, 0, 'V1', 'SELECT 1;', 'SELECT 2;');
      createMigration(tmpDir, 1, 1, 0, 'V1.1', 'SELECT 3;', 'SELECT 4;');

      const client = createMockClient();
      client.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('SELECT version FROM')) {
          return { rows: [{ version: '1.1.0' }] };
        }
        return { rows: [] };
      });

      const pool = createMockPool(client);
      await rollbackLast(pool, dbConfig, tmpDir);

      expect(getLogger().success).toHaveBeenCalledWith('Rolled back 1.1.0');
    });

    it('allows rollback of first migration (no previous version)', async () => {
      createMigration(tmpDir, 1, 0, 0, 'First', 'SELECT 1;', 'SELECT 2;');

      const client = createMockClient();
      client.query.mockImplementation(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('SELECT version FROM')) {
          return { rows: [{ version: '1.0.0' }] };
        }
        return { rows: [] };
      });

      const pool = createMockPool(client);
      await rollbackLast(pool, dbConfig, tmpDir);

      expect(getLogger().success).toHaveBeenCalledWith('Rolled back 1.0.0');
    });
  });
});
