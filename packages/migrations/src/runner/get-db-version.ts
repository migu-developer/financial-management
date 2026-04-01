import type { PoolClient } from 'pg';

const ENSURE_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    version         varchar(20) NOT NULL,
    description     text,
    executed_at     timestamptz DEFAULT now(),
    execution_time  integer,
    checksum        varchar(64),
    success         boolean DEFAULT true
);
`;

export async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(ENSURE_TABLE);
}

export async function getDbVersion(client: PoolClient): Promise<string | null> {
  const result = await client.query<{ version: string }>(
    `SELECT version FROM schema_migrations
     WHERE success = true
     ORDER BY executed_at DESC
     LIMIT 1`,
  );
  return result.rows[0]?.version ?? null;
}
