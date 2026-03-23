import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadConfig } from './config';
import { logger } from './lib/logger';
import { getPool, initSchema, closePool, setSearchPath } from './lib/db';
import { SemanticVersion } from './lib/semantic-version';
import { getVersionList } from './runner/get-version-list';
import { ensureMigrationsTable, getDbVersion } from './runner/get-db-version';
import { executeMigrations, rollbackLast } from './runner/execute-migration';

yargs(hideBin(process.argv))
  .option('env', {
    alias: 'e',
    type: 'string',
    description: 'Environment (local, development, production)',
    default: 'local',
  })
  .command(
    'migrate',
    'Run pending migrations',
    (y) =>
      y
        .option('to', {
          type: 'string',
          description: 'Target version (e.g. 1.2.0)',
        })
        .option('once', {
          type: 'boolean',
          description: 'Apply only the next pending migration',
          default: false,
        }),
    async (argv) => {
      try {
        const config = loadConfig(argv.env);
        const pool = getPool(config.db);
        await initSchema(config.db);
        await executeMigrations(pool, config.db, config.migrationsDir, {
          targetVersion: argv.to,
          once: argv.once,
        });
      } catch (err) {
        logger.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
      } finally {
        await closePool();
      }
    },
  )
  .command(
    'rollback',
    'Rollback the last migration',
    (y) =>
      y.option('force', {
        type: 'boolean',
        description: 'Force rollback across major version boundaries',
        default: false,
      }),
    async (argv) => {
      try {
        const config = loadConfig(argv.env);
        const pool = getPool(config.db);
        await initSchema(config.db);
        await rollbackLast(pool, config.db, config.migrationsDir, {
          force: argv.force,
        });
      } catch (err) {
        logger.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
      } finally {
        await closePool();
      }
    },
  )
  .command(
    'status',
    'Show current migration status',
    () => {},
    async (argv) => {
      try {
        const config = loadConfig(argv.env);
        const pool = getPool(config.db);
        await initSchema(config.db);

        const client = await pool.connect();
        try {
          await setSearchPath(client, config.db.schema);
          await ensureMigrationsTable(client);
          const current = await getDbVersion(client);
          const allVersions = getVersionList(config.migrationsDir);
          const lastVersion = allVersions[allVersions.length - 1];
          const latest = lastVersion
            ? `${lastVersion.major}.${lastVersion.minor}.${lastVersion.patch}`
            : '(none)';

          logger.divider();
          logger.info(`Schema:    ${config.db.schema}`);
          logger.info(`Current:   ${current ?? '(none)'}`);
          logger.info(`Latest:    ${latest}`);

          const currentSv = current ? SemanticVersion.parse(current) : null;

          const pending = allVersions.filter((v) => {
            const sv = SemanticVersion.fromPath(v.major, v.minor, v.patch);
            return currentSv ? sv.isGreaterThan(currentSv) : true;
          });

          if (pending.length > 0) {
            logger.info(`Pending:   ${pending.length} migration(s)`);
            for (const v of pending) {
              logger.migration(
                `${v.major}.${v.minor}.${v.patch}`,
                v.config.description,
              );
            }
          } else {
            logger.success('Database is up to date');
          }
          logger.divider();
        } finally {
          client.release();
        }
      } catch (err) {
        logger.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
      } finally {
        await closePool();
      }
    },
  )
  .command(
    'create-migration',
    'Create a new migration directory',
    (y) =>
      y
        .option('major', {
          type: 'boolean',
          description: 'Bump major version',
        })
        .option('minor', {
          type: 'boolean',
          description: 'Bump minor version',
        })
        .option('description', {
          alias: 'd',
          type: 'string',
          description: 'Migration description',
          demandOption: true,
        }),
    async (argv) => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const config = loadConfig(argv.env);
      const allVersions = getVersionList(config.migrationsDir);

      let major = 1;
      let minor = 0;
      let patch = 0;

      const last = allVersions[allVersions.length - 1];
      if (last) {
        major = last.major;
        minor = last.minor;
        patch = last.patch;

        if (argv.major) {
          major++;
          minor = 0;
          patch = 0;
        } else if (argv.minor) {
          minor++;
          patch = 0;
        } else {
          patch++;
        }
      }

      const versionStr = `${major}.${minor}.${patch}`;
      const dir = path.join(
        config.migrationsDir,
        String(major),
        String(minor),
        String(patch),
      );

      fs.mkdirSync(dir, { recursive: true });

      const slug = argv.description
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      const versionTs = `import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description: '${argv.description}',
  scripts: [
    sqlScript('1_up_${slug}', '1_down_${slug}'),
  ],
});
`;

      fs.writeFileSync(path.join(dir, 'version.ts'), versionTs);
      fs.writeFileSync(
        path.join(dir, `1_up_${slug}.sql`),
        `SET search_path TO financial_management;\n\n-- TODO: Write UP migration\n`,
      );
      fs.writeFileSync(
        path.join(dir, `1_down_${slug}.sql`),
        `SET search_path TO financial_management;\n\n-- TODO: Write DOWN migration\n`,
      );

      logger.success(`Created migration ${versionStr} at ${dir}`);
      logger.info(`Files:`);
      logger.info(`  version.ts`);
      logger.info(`  1_up_${slug}.sql`);
      logger.info(`  1_down_${slug}.sql`);
    },
  )
  .demandCommand(1, 'You must specify a command')
  .strict()
  .help()
  .parse();
