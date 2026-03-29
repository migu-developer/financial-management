import { Pool } from 'pg';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';

jest.mock('pg', () => {
  const MockPool = jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(undefined),
  }));
  return { Pool: MockPool };
});

const MockPool = Pool as jest.MockedClass<typeof Pool>;

beforeEach(() => {
  MockPool.mockClear();
  MockPool.mockImplementation(
    () =>
      ({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        end: jest.fn().mockResolvedValue(undefined),
      }) as never,
  );
});

describe('PostgresDatabaseService.query', () => {
  it('throws DatabaseError when DATABASE_URL is not set', async () => {
    const orig = process.env['DATABASE_URL'];
    delete process.env['DATABASE_URL'];
    await expect(
      new PostgresDatabaseService().query('SELECT 1'),
    ).rejects.toThrow('DATABASE_URL env var is required');
    process.env['DATABASE_URL'] = orig;
  });

  it('returns rows from the write pool', async () => {
    process.env['DATABASE_URL'] = 'postgresql://write';
    const rows = [{ id: '1', name: 'CC' }];
    MockPool.mockImplementationOnce(
      () =>
        ({
          query: jest.fn().mockResolvedValue({ rows }),
          end: jest.fn(),
        }) as never,
    );
    const result = await new PostgresDatabaseService().query(
      'SELECT id, name FROM t',
    );
    expect(result).toEqual(rows);
  });

  it('forwards params to the write pool query', async () => {
    process.env['DATABASE_URL'] = 'postgresql://write';
    const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    MockPool.mockImplementationOnce(
      () => ({ query: mockQuery, end: jest.fn() }) as never,
    );
    await new PostgresDatabaseService().query('SELECT $1', ['val']);
    expect(mockQuery).toHaveBeenCalledWith('SELECT $1', ['val']);
  });

  it('reuses the write pool on subsequent calls (singleton)', async () => {
    process.env['DATABASE_URL'] = 'postgresql://write';
    const svc = new PostgresDatabaseService();
    await svc.query('SELECT 1');
    await svc.query('SELECT 2');
    expect(MockPool).toHaveBeenCalledTimes(1);
  });
});

describe('PostgresDatabaseService.queryReadOnly', () => {
  it('throws DatabaseError when DATABASE_READONLY_URL is not set', async () => {
    const orig = process.env['DATABASE_READONLY_URL'];
    delete process.env['DATABASE_READONLY_URL'];
    await expect(
      new PostgresDatabaseService().queryReadOnly('SELECT 1'),
    ).rejects.toThrow('DATABASE_READONLY_URL env var is required');
    process.env['DATABASE_READONLY_URL'] = orig;
  });

  it('returns rows from the readonly pool', async () => {
    process.env['DATABASE_READONLY_URL'] = 'postgresql://readonly';
    const rows = [{ id: '1', code: 'COP' }];
    MockPool.mockImplementationOnce(
      () =>
        ({
          query: jest.fn().mockResolvedValue({ rows }),
          end: jest.fn(),
        }) as never,
    );
    const result = await new PostgresDatabaseService().queryReadOnly(
      'SELECT id, code FROM financial_management.currencies',
    );
    expect(result).toEqual(rows);
  });

  it('forwards params to the readonly pool query', async () => {
    process.env['DATABASE_READONLY_URL'] = 'postgresql://readonly';
    const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    MockPool.mockImplementationOnce(
      () => ({ query: mockQuery, end: jest.fn() }) as never,
    );
    await new PostgresDatabaseService().queryReadOnly('SELECT $1', ['param']);
    expect(mockQuery).toHaveBeenCalledWith('SELECT $1', ['param']);
  });

  it('uses a separate pool from the write pool', async () => {
    process.env['DATABASE_URL'] = 'postgresql://write';
    process.env['DATABASE_READONLY_URL'] = 'postgresql://readonly';
    const mockWriteQuery = jest.fn().mockResolvedValue({ rows: [{ id: 'w' }] });
    const mockReadQuery = jest.fn().mockResolvedValue({ rows: [{ id: 'r' }] });
    MockPool.mockImplementationOnce(
      () => ({ query: mockWriteQuery, end: jest.fn() }) as never,
    ).mockImplementationOnce(
      () => ({ query: mockReadQuery, end: jest.fn() }) as never,
    );
    const svc = new PostgresDatabaseService();
    const writeResult = await svc.query('SELECT 1');
    const readResult = await svc.queryReadOnly('SELECT 1');
    expect(writeResult).toEqual([{ id: 'w' }]);
    expect(readResult).toEqual([{ id: 'r' }]);
    expect(MockPool).toHaveBeenCalledTimes(2);
  });
});

describe('PostgresDatabaseService.end', () => {
  it('ends both pools when both have been created', async () => {
    process.env['DATABASE_URL'] = 'postgresql://write';
    process.env['DATABASE_READONLY_URL'] = 'postgresql://readonly';
    const mockWriteEnd = jest.fn().mockResolvedValue(undefined);
    const mockReadEnd = jest.fn().mockResolvedValue(undefined);
    MockPool.mockImplementationOnce(
      () =>
        ({
          query: jest.fn().mockResolvedValue({ rows: [] }),
          end: mockWriteEnd,
        }) as never,
    ).mockImplementationOnce(
      () =>
        ({
          query: jest.fn().mockResolvedValue({ rows: [] }),
          end: mockReadEnd,
        }) as never,
    );
    const svc = new PostgresDatabaseService();
    await svc.query('SELECT 1');
    await svc.queryReadOnly('SELECT 1');
    await svc.end();
    expect(mockWriteEnd).toHaveBeenCalledTimes(1);
    expect(mockReadEnd).toHaveBeenCalledTimes(1);
  });

  it('only ends the pool that was created', async () => {
    process.env['DATABASE_READONLY_URL'] = 'postgresql://readonly';
    const mockReadEnd = jest.fn().mockResolvedValue(undefined);
    MockPool.mockImplementationOnce(
      () =>
        ({
          query: jest.fn().mockResolvedValue({ rows: [] }),
          end: mockReadEnd,
        }) as never,
    );
    const svc = new PostgresDatabaseService();
    await svc.queryReadOnly('SELECT 1');
    await svc.end();
    expect(mockReadEnd).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when no pool has been created', async () => {
    await expect(new PostgresDatabaseService().end()).resolves.toBeUndefined();
  });
});
