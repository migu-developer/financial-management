import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';
import type { Version } from 'src/interfaces/version';
import type { DatabaseConfig } from 'src/interfaces/database';
import { SemanticVersion } from 'src/lib/semantic-version';
import { logger } from 'src/lib/logger';
import { setSearchPath } from 'src/lib/db';
import { getExecutionFunctions } from './get-execution-fn';
import { ensureMigrationsTable, getDbVersion } from 'src/runner/get-db-version';
import { setDbVersion, removeDbVersion } from './set-db-version';
import { getVersionList } from './get-version-list';

export interface MigrateOptions {
  targetVersion?: string;
  once?: boolean;
}

function computeChecksum(versionDir: string): string {
  const hash = crypto.createHash('sha256');
  const files = fs
    .readdirSync(versionDir)
    .sort()
    .filter((f) => f.endsWith('.sql') || f.endsWith('.ts'));
  for (const file of files) {
    hash.update(fs.readFileSync(path.join(versionDir, file)));
  }
  return hash.digest('hex').slice(0, 16);
}

export async function executeMigrations(
  pool: Pool,
  config: DatabaseConfig,
  migrationsDir: string,
  options: MigrateOptions = {},
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
    const target = options.targetVersion
      ? SemanticVersion.parse(options.targetVersion)
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

    const toApply = options.once ? [pending[0]!] : pending;
    const finalVersion = toApply[toApply.length - 1]!;
    const finalVersionStr = `${finalVersion.major}.${finalVersion.minor}.${finalVersion.patch}`;

    logger.info(
      `Current: ${currentVersionStr ?? '(none)'} → Target: ${finalVersionStr}`,
    );
    logger.info(
      `${toApply.length} migration(s) to apply${options.once ? ' (--once)' : ''}`,
    );
    logger.divider();

    for (const version of toApply) {
      await applyVersion(client, config.schema, version);
    }

    logger.divider();
    logger.success(`Migrated to ${finalVersionStr}`);
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

export interface RollbackOptions {
  force?: boolean;
}

export async function rollbackLast(
  pool: Pool,
  config: DatabaseConfig,
  migrationsDir: string,
  options: RollbackOptions = {},
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

    const currentIdx = allVersions.findIndex((v) => {
      const sv = SemanticVersion.fromPath(v.major, v.minor, v.patch);
      return sv.equals(currentVersion);
    });

    if (currentIdx === -1) {
      logger.error(
        `Version ${currentVersionStr} not found in migrations directory`,
      );
      return;
    }

    // Cross-major protection: check if rolling back would cross a major version boundary
    if (currentIdx > 0 && !options.force) {
      const previousVersion = allVersions[currentIdx - 1]!;
      if (previousVersion.major !== currentVersion.major) {
        throw new Error(
          `Cannot rollback ${currentVersionStr}: would cross major version boundary ` +
            `(${currentVersion.major}.x.x → ${previousVersion.major}.x.x). ` +
            `Major rollbacks are breaking changes. Use --force to override.`,
        );
      }
    }

    const target = allVersions[currentIdx]!;
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

      await removeDbVersion(client, versionStr);

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
