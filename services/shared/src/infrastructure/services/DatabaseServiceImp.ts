import { Pool } from 'pg';
import { DatabaseError } from '@packages/models/shared/utils/errors/database';
import { DatabaseService } from '@services/shared/domain/services/database';

let pool: Pool | null = null;

function getPool(connectionString: string): Pool {
  pool ??= new Pool({
    connectionString,
    max: 3,
  });

  return pool;
}

export class PostgresDatabaseService extends DatabaseService {
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new DatabaseError('DATABASE_URL env var is required');
    }
    const result = await getPool(connectionString).query(sql, params);
    return result.rows as T[];
  }

  async queryReadOnly<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const connectionString = process.env['DATABASE_READONLY_URL'];
    if (!connectionString) {
      throw new DatabaseError('DATABASE_READONLY_URL env var is required');
    }
    const result = await getPool(connectionString).query(sql, params);
    return result.rows as T[];
  }

  async end(): Promise<void> {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
}
