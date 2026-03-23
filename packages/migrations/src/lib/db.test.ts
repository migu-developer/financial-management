import { Pool, type PoolClient } from 'pg';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockEnd = jest.fn();
  const MockPool = jest.fn().mockImplementation(() => ({
    query: mockQuery,
    end: mockEnd,
  }));
  return { Pool: MockPool, mockQuery, mockEnd };
});

// Access the mock helpers injected by the factory
const { mockQuery, mockEnd } = jest.requireMock<{
  mockQuery: jest.Mock;
  mockEnd: jest.Mock;
}>('pg');

// Must import AFTER jest.mock so the module gets the mocked Pool
import {
  getPool,
  initSchema,
  setSearchPath,
  closePool,
  quoteIdent,
} from './db';
import type { DatabaseConfig } from 'src/interfaces/database';

const config: DatabaseConfig = {
  connectionString: 'postgresql://localhost:5432/test',
  schema: 'financial_management',
};

describe('db', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton pool between tests by closing it
  });

  afterEach(async () => {
    await closePool();
  });

  describe('getPool', () => {
    it('creates a Pool with the connection string', () => {
      getPool(config);
      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
      });
    });

    it('returns the same pool instance on subsequent calls (singleton)', () => {
      const pool1 = getPool(config);
      const pool2 = getPool(config);
      expect(pool1).toBe(pool2);
      expect(Pool).toHaveBeenCalledTimes(1);
    });
  });

  describe('initSchema', () => {
    it('executes CREATE SCHEMA IF NOT EXISTS', async () => {
      await initSchema(config);
      expect(mockQuery).toHaveBeenCalledWith(
        'CREATE SCHEMA IF NOT EXISTS financial_management',
      );
    });

    it('rejects invalid schema names', async () => {
      const badConfig = { ...config, schema: 'drop;--' };
      await expect(initSchema(badConfig)).rejects.toThrow(
        'Invalid SQL identifier',
      );
    });
  });

  describe('setSearchPath', () => {
    it('executes SET search_path on the client', async () => {
      const mockClient = { query: jest.fn() };
      await setSearchPath(
        mockClient as unknown as PoolClient,
        'financial_management',
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'SET search_path TO financial_management',
      );
    });

    it('rejects invalid schema names', async () => {
      const mockClient = { query: jest.fn() };
      await expect(
        setSearchPath(mockClient as unknown as PoolClient, 'bad schema'),
      ).rejects.toThrow('Invalid SQL identifier');
    });
  });

  describe('closePool', () => {
    it('calls pool.end() and resets the singleton', async () => {
      getPool(config);
      await closePool();
      expect(mockEnd).toHaveBeenCalledTimes(1);

      // After closing, getPool creates a new Pool
      getPool(config);
      expect(Pool).toHaveBeenCalledTimes(2);
    });

    it('does nothing if no pool exists', async () => {
      // closePool from afterEach already cleared it
      await closePool();
      expect(mockEnd).not.toHaveBeenCalled();
    });
  });

  describe('quoteIdent', () => {
    it('accepts valid SQL identifiers', () => {
      expect(quoteIdent('financial_management')).toBe('financial_management');
      expect(quoteIdent('public')).toBe('public');
      expect(quoteIdent('_private')).toBe('_private');
      expect(quoteIdent('Schema123')).toBe('Schema123');
    });

    it('rejects identifiers with special characters', () => {
      expect(() => quoteIdent('drop;--')).toThrow('Invalid SQL identifier');
      expect(() => quoteIdent('my schema')).toThrow('Invalid SQL identifier');
      expect(() => quoteIdent('table.name')).toThrow('Invalid SQL identifier');
      expect(() => quoteIdent("'; DROP TABLE")).toThrow(
        'Invalid SQL identifier',
      );
    });

    it('rejects identifiers starting with a number', () => {
      expect(() => quoteIdent('123schema')).toThrow('Invalid SQL identifier');
    });

    it('rejects empty strings', () => {
      expect(() => quoteIdent('')).toThrow('Invalid SQL identifier');
    });
  });
});
