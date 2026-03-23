import { loadConfig } from './config';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reads DATABASE_URL from process.env', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.DATABASE_SCHEMA = 'test_schema';

    const config = loadConfig('local');
    expect(config.db.connectionString).toBe('postgresql://localhost:5432/test');
    expect(config.db.schema).toBe('test_schema');
  });

  it('defaults DATABASE_SCHEMA to financial_management', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    delete process.env.DATABASE_SCHEMA;

    const config = loadConfig('local');
    expect(config.db.schema).toBe('financial_management');
  });

  it('throws when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;
    expect(() => loadConfig('nonexistent')).toThrow('DATABASE_URL not set');
  });

  it('migrationsDir points to the migrations directory', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    const config = loadConfig('local');
    expect(config.migrationsDir).toMatch(/migrations$/);
  });
});
