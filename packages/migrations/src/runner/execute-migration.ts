import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Version } from 'src/interfaces/version';
import type { DatabaseConfig } from 'src/interfaces/database';
import { SemanticVersion } from 'src/lib/semantic-version';
import { logger } from 'src/lib/logger';
import { setSearchPath } from 'src/lib/db';
import { getExecutionFunctions } from './get-execution-fn';
import { ensureMigrationsTable, getDbVersion } from 'src/runner/get-db-version';
import { setDbVersion } from './set-db-version';
import { getVersionList } from './get-version-list';

function computeChecksum(versionDir: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(versionDir);
  return hash.digest('hex').slice(0, 16);
}

export async function executeMigrations(
  pool: Pool,
  config: DatabaseConfig,
  migrationsDir: string,
  targetVersion?: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await setSearchPath(client, config.schema);
    await ensureMigrationsTable(client);

    const currentVersionStr = await getDbVersion(client);
    const currentVersion = currentVersionStr
      ? SemanticVersion.parse(currentVersionStr)
      : null;

    const allVersions = getVersionList(migrationsDir);
    if (allVersions.length === 0) {
      logger.warn('No migrations found');
      return;
    }

    const latest = allVersions[allVersions.length - 1]!;
    const target = targetVersion
      ? SemanticVersion.parse(targetVersion)
      : SemanticVersion.fromPath(latest.major, latest.minor, latest.patch);

    const pending = allVersions.filter((v) => {
      const sv = SemanticVersion.fromPath(v.major, v.minor, v.patch);
      const isAfterCurrent = currentVersion
        ? sv.isGreaterThan(currentVersion)
        : true;
      const isBeforeOrEqualTarget = sv.isLessThan(target) || sv.equals(target);
      return isAfterCurrent && isBeforeOrEqualTarget;
    });

    if (pending.length === 0) {
      logger.success(
        `Database is up to date at version ${currentVersionStr ?? '(none)'}`,
      );
      return;
    }

    logger.info(
      `Current: ${currentVersionStr ?? '(none)'} → Target: ${target.toString()}`,
    );
    logger.info(`${pending.length} migration(s) to apply`);
    logger.divider();

    for (const version of pending) {
      await applyVersion(client, config.schema, version);
    }

    logger.divider();
    logger.success(`Migrated to ${target.toString()}`);
  } finally {
    client.release();
  }
}

async function applyVersion(
  client: PoolClient,
  schema: string,
  version: Version,
): Promise<void> {
  const versionStr = `${version.major}.${version.minor}.${version.patch}`;
  const start = Date.now();

  logger.migration(versionStr, version.config.description);

  const executions = getExecutionFunctions(
    version.path,
    version.config.scripts,
  );

  await client.query('BEGIN');
  await setSearchPath(client, schema);

  try {
    for (const exec of executions) {
      await exec.up(client);
    }

    const elapsed = Date.now() - start;
    await setDbVersion(
      client,
      versionStr,
      version.config.description,
      elapsed,
      computeChecksum(version.path),
      true,
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Failed at ${versionStr}:`, err);
    throw err;
  }
}

export async function rollbackLast(
  pool: Pool,
  config: DatabaseConfig,
  migrationsDir: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await setSearchPath(client, config.schema);
    await ensureMigrationsTable(client);

    const currentVersionStr = await getDbVersion(client);
    if (!currentVersionStr) {
      logger.warn('No migrations to rollback');
      return;
    }

    const currentVersion = SemanticVersion.parse(currentVersionStr);
    const allVersions = getVersionList(migrationsDir);

    const target = allVersions.find((v) => {
      const sv = SemanticVersion.fromPath(v.major, v.minor, v.patch);
      return sv.equals(currentVersion);
    });

    if (!target) {
      logger.error(
        `Version ${currentVersionStr} not found in migrations directory`,
      );
      return;
    }

    const versionStr = `${target.major}.${target.minor}.${target.patch}`;
    logger.info(`Rolling back ${versionStr}: ${target.config.description}`);

    const executions = getExecutionFunctions(
      target.path,
      target.config.scripts,
    );

    await client.query('BEGIN');
    await setSearchPath(client, config.schema);

    try {
      for (let i = executions.length - 1; i >= 0; i--) {
        await executions[i]!.down(client);
      }

      await setDbVersion(
        client,
        versionStr,
        `ROLLBACK: ${target.config.description}`,
        0,
        null,
        false,
      );

      await client.query('COMMIT');
      logger.success(`Rolled back ${versionStr}`);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Rollback failed at ${versionStr}:`, err);
      throw err;
    }
  } finally {
    client.release();
  }
}
