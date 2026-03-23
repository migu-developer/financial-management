import type { PoolClient } from 'pg';

export async function setDbVersion(
  client: PoolClient,
  version: string,
  description: string,
  executionTimeMs: number,
  checksum: string | null,
  success: boolean,
): Promise<void> {
  await client.query(
    `INSERT INTO schema_migrations (version, description, execution_time, checksum, success)
     VALUES ($1, $2, $3, $4, $5)`,
    [version, description, executionTimeMs, checksum, success],
  );
}
