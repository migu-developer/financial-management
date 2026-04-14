import { Pool } from 'pg';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { DatabaseError } from '@packages/models/shared/utils/errors/database';
import { DatabaseService } from '@services/shared/domain/services/database';

const tracer = new Tracer({ serviceName: 'database' });

export class PostgresDatabaseService extends DatabaseService {
  private writePool: Pool | null = null;
  private readPool: Pool | null = null;

  static requiresSsl(connectionString: string): boolean {
    return (
      connectionString.includes('pooler.supabase.com') ||
      connectionString.includes('amazonaws.com')
    );
  }

  private getWritePool(connectionString: string): Pool {
    this.writePool ??= new Pool({
      connectionString,
      max: 3,
      ...(PostgresDatabaseService.requiresSsl(connectionString) && {
        ssl: { rejectUnauthorized: false },
      }),
    });
    return this.writePool;
  }

  private getReadPool(connectionString: string): Pool {
    this.readPool ??= new Pool({
      connectionString,
      max: 3,
      ...(PostgresDatabaseService.requiresSsl(connectionString) && {
        ssl: { rejectUnauthorized: false },
      }),
    });
    return this.readPool;
  }

  @tracer.captureMethod({ subSegmentName: 'DB:query:write' })
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new DatabaseError('DATABASE_URL env var is required');
    }
    const result = await this.getWritePool(connectionString).query(sql, params);
    return result.rows as T[];
  }

  @tracer.captureMethod({ subSegmentName: 'DB:query:read' })
  async queryReadOnly<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const connectionString = process.env['DATABASE_READONLY_URL'];
    if (!connectionString) {
      throw new DatabaseError('DATABASE_READONLY_URL env var is required');
    }
    const result = await this.getReadPool(connectionString).query(sql, params);
    return result.rows as T[];
  }

  async end(): Promise<void> {
    if (this.writePool) {
      await this.writePool.end();
      this.writePool = null;
    }
    if (this.readPool) {
      await this.readPool.end();
      this.readPool = null;
    }
  }
}
