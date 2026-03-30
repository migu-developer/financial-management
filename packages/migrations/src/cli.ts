import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadConfig } from './config';
import { logger } from './lib/logger';
import { getPool, initSchema, closePool, setSearchPath } from './lib/db';
import { SemanticVersion } from './lib/semantic-version';
import { getVersionList } from './runner/get-version-list';
import { ensureMigrationsTable, getDbVersion } from './runner/get-db-version';
import { executeMigrations, rollbackLast } from './runner/execute-migration';

export function buildCli(argv: string[]) {
  // pnpm injects `--` when forwarding args (e.g. `pnpm migrate -- --once`).
  // Yargs treats `--` as end-of-options, so we strip bare `--` entries.
  const args = argv.filter((arg) => arg !== '--');

  return yargs(args)
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
      async (parsedArgv) => {
        try {
          const config = loadConfig(parsedArgv.env);
          const pool = getPool(config.db);
          await initSchema(config.db);
          await executeMigrations(pool, config.db, config.migrationsDir, {
            targetVersion: parsedArgv.to,
            once: parsedArgv.once,
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
      async (parsedArgv) => {
        try {
          const config = loadConfig(parsedArgv.env);
          const pool = getPool(config.db);
          await initSchema(config.db);
          await rollbackLast(pool, config.db, config.migrationsDir, {
            force: parsedArgv.force,
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
      async (parsedArgv) => {
        try {
          const config = loadConfig(parsedArgv.env);
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
      async (parsedArgv) => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const config = loadConfig(parsedArgv.env);
        const allVersions = getVersionList(config.migrationsDir);

        let major = 1;
        let minor = 0;
        let patch = 0;

        const last = allVersions[allVersions.length - 1];
        if (last) {
          major = last.major;
          minor = last.minor;
          patch = last.patch;

          if (parsedArgv.major) {
            major++;
            minor = 0;
            patch = 0;
          } else if (parsedArgv.minor) {
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

        const slug = parsedArgv.description
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');

        const versionTs = `import { config, sqlScript } from 'src/lib/version-config';

export default config({
  description: '${parsedArgv.description}',
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
    .command(
      'export',
      'Export schema DDL (structure only) to a SQL file for integration tests',
      (y) =>
        y.option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output file path (relative to package root)',
          default: 'src/exports/schema.sql',
        }),
      async (parsedArgv) => {
        try {
          const { execSync } = await import('node:child_process');
          const fs = await import('node:fs');
          const path = await import('node:path');
          const config = loadConfig(parsedArgv.env);
          const schema = config.db.schema;

          logger.info(`Exporting schema "${schema}" from database...`);

          let dump: string;
          try {
            dump = execSync(
              `pg_dump --schema-only --no-owner --no-privileges --schema=${schema} "${config.db.connectionString}"`,
              { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
            );
          } catch {
            // Fallback: pg_dump version mismatch — try Docker container
            logger.warn(
              'Local pg_dump failed (likely version mismatch). Trying Docker container...',
            );
            const container = execSync(
              "docker ps --format '{{.Names}}' | grep -i 'supabase.*db\\|postgres'",
              { encoding: 'utf8' },
            )
              .trim()
              .split('\n')[0];
            if (!container)
              throw new Error('No Supabase/Postgres Docker container found');
            logger.info(`Using pg_dump from container: ${container}`);
            dump = execSync(
              `docker exec ${container} pg_dump --schema-only --no-owner --no-privileges --schema=${schema} -U postgres postgres`,
              { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
            );
          }

          // Strip RLS-related statements (line-by-line state machine
          // to handle multi-line CREATE POLICY blocks)
          const lines = dump.split('\n');
          const cleanedLines: string[] = [];
          let insidePolicy = false;
          let policyCommentPhase = 0; // 0=none, 1=saw "-- Name:...POLICY", 2=saw "--"

          for (const line of lines) {
            // Skip 3-line comment headers: "-- \n-- Name: ... Type: POLICY ...\n--"
            if (line.match(/^-- Name:.*Type: POLICY;/)) {
              policyCommentPhase = 1;
              continue;
            }
            if (policyCommentPhase === 1 && line.trim() === '--') {
              policyCommentPhase = 0;
              continue;
            }
            policyCommentPhase = 0;

            // Skip ENABLE/FORCE ROW LEVEL SECURITY
            if (/ALTER TABLE .+ (ENABLE|FORCE) ROW LEVEL SECURITY/.test(line))
              continue;

            // Skip CREATE POLICY (may span multiple lines until ;)
            if (/^CREATE POLICY /.test(line)) {
              insidePolicy = !line.includes(';');
              continue;
            }
            if (insidePolicy) {
              if (line.includes(';')) insidePolicy = false;
              continue;
            }

            cleanedLines.push(line);
          }

          const cleaned = cleanedLines.join('\n');

          const packageRoot = path.resolve(__dirname, '..');
          const outputPath = path.resolve(packageRoot, parsedArgv.output);
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, cleaned, 'utf8');

          logger.success(`Schema exported to ${outputPath}`);
          logger.info(
            `Use this file to create test schemas by replacing "${schema}" with your test schema name`,
          );
        } catch (err) {
          logger.error(err instanceof Error ? err.message : err);
          process.exitCode = 1;
        }
      },
    )
    .demandCommand(1, 'You must specify a command')
    .strict()
    .help();
}

// Run when executed directly (not when imported by tests)
if (require.main === module) {
  buildCli(hideBin(process.argv)).parse();
}
