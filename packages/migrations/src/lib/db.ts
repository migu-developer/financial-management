import { Pool, type PoolClient } from 'pg';
import type { DatabaseConfig } from 'src/interfaces/database';

let pool: Pool | null = null;

export function getPool(config: DatabaseConfig): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.connectionString });
  }
  return pool;
}

export async function initSchema(config: DatabaseConfig): Promise<void> {
  const p = getPool(config);
  await p.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(config.schema)}`);
}

export async function setSearchPath(
  client: PoolClient,
  schema: string,
): Promise<void> {
  await client.query(`SET search_path TO ${quoteIdent(schema)}`);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export function quoteIdent(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: "${identifier}"`);
  }
  return identifier;
}
