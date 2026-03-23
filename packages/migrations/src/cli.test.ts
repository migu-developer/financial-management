import { buildCli } from './cli';

jest.mock('./config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    db: {
      connectionString: 'postgresql://localhost:5432/test',
      schema: 'financial_management',
    },
    migrationsDir: '/tmp/fake-migrations',
  }),
}));

jest.mock('./lib/db', () => ({
  getPool: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
  }),
  initSchema: jest.fn(),
  closePool: jest.fn(),
  setSearchPath: jest.fn(),
}));

jest.mock('./runner/execute-migration', () => ({
  executeMigrations: jest.fn(),
  rollbackLast: jest.fn(),
}));

jest.mock('./runner/get-db-version', () => ({
  ensureMigrationsTable: jest.fn(),
  getDbVersion: jest.fn().mockResolvedValue(null),
}));

jest.mock('./runner/get-version-list', () => ({
  getVersionList: jest.fn().mockReturnValue([]),
}));

jest.mock('./lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    migration: jest.fn(),
    divider: jest.fn(),
  },
}));

const { executeMigrations, rollbackLast } = jest.requireMock<
  typeof import('./runner/execute-migration')
>('./runner/execute-migration');

const { closePool } = jest.requireMock<typeof import('./lib/db')>('./lib/db');

beforeEach(() => {
  jest.clearAllMocks();
  process.exitCode = undefined;
});

async function run(args: string[]) {
  await buildCli(args).parse();
}

describe('cli', () => {
  describe('migrate', () => {
    it('calls executeMigrations with default options', async () => {
      await run(['migrate']);

      expect(executeMigrations).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ schema: 'financial_management' }),
        '/tmp/fake-migrations',
        { targetVersion: undefined, once: false },
      );
      expect(closePool).toHaveBeenCalled();
    });

    it('passes --once flag to executeMigrations', async () => {
      await run(['migrate', '--once']);

      expect(executeMigrations).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ once: true }),
      );
    });

    it('passes --to flag to executeMigrations', async () => {
      await run(['migrate', '--to', '1.2.0']);

      expect(executeMigrations).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ targetVersion: '1.2.0' }),
      );
    });

    it('strips bare -- from args (pnpm compatibility)', async () => {
      await run(['migrate', '--', '--once']);

      expect(executeMigrations).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ once: true }),
      );
    });

    it('sets process.exitCode on error', async () => {
      (executeMigrations as jest.Mock).mockRejectedValueOnce(
        new Error('db error'),
      );

      await run(['migrate']);

      expect(process.exitCode).toBe(1);
    });

    it('always calls closePool even on error', async () => {
      (executeMigrations as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await run(['migrate']);

      expect(closePool).toHaveBeenCalled();
    });
  });

  describe('rollback', () => {
    it('calls rollbackLast with default options', async () => {
      await run(['rollback']);

      expect(rollbackLast).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        '/tmp/fake-migrations',
        { force: false },
      );
      expect(closePool).toHaveBeenCalled();
    });

    it('passes --force flag to rollbackLast', async () => {
      await run(['rollback', '--force']);

      expect(rollbackLast).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ force: true }),
      );
    });

    it('strips bare -- and passes --force (pnpm compatibility)', async () => {
      await run(['rollback', '--', '--force']);

      expect(rollbackLast).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ force: true }),
      );
    });

    it('sets process.exitCode on error', async () => {
      (rollbackLast as jest.Mock).mockRejectedValueOnce(
        new Error('rollback error'),
      );

      await run(['rollback']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('status', () => {
    it('calls closePool after execution', async () => {
      await run(['status']);

      expect(closePool).toHaveBeenCalled();
    });

    it('sets process.exitCode on error', async () => {
      const { getPool } =
        jest.requireMock<typeof import('./lib/db')>('./lib/db');
      (getPool as jest.Mock).mockReturnValueOnce({
        connect: jest.fn().mockRejectedValue(new Error('connection error')),
      });

      await run(['status']);

      expect(process.exitCode).toBe(1);
    });
  });

  describe('arg parsing', () => {
    it('passes --env flag to loadConfig', async () => {
      const { loadConfig } =
        jest.requireMock<typeof import('./config')>('./config');

      await run(['migrate', '--env', 'production']);

      expect(loadConfig).toHaveBeenCalledWith('production');
    });

    it('defaults --env to local', async () => {
      const { loadConfig } =
        jest.requireMock<typeof import('./config')>('./config');

      await run(['migrate']);

      expect(loadConfig).toHaveBeenCalledWith('local');
    });
  });
});
