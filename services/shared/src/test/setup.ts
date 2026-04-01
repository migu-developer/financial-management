import { Pool } from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseService } from '@services/shared/domain/services/database';
import { DatabaseError } from '@packages/models/shared/utils/errors/database';

export class TestDatabaseService extends DatabaseService {
  private pool: Pool | null = null;
  private readonly sourceSchema: string;
  private readonly testSchema: string;

  constructor(
    private readonly connectionString: string,
    sourceSchema: string,
    testRunId: string,
  ) {
    super();
    if (!sourceSchema) {
      throw new DatabaseError('sourceSchema is required for integration tests');
    }
    if (!testRunId) {
      throw new DatabaseError('testRunId is required for integration tests');
    }
    this.sourceSchema = sourceSchema;
    const sanitizedRunId = testRunId.replace(/[^A-Za-z0-9_]/g, '_');
    this.testSchema = `${sourceSchema}_${sanitizedRunId}_test`;
  }

  get schema(): string {
    return this.testSchema;
  }

  private getPool(): Pool {
    this.pool ??= new Pool({
      connectionString: this.connectionString,
      max: 5,
    });
    return this.pool;
  }

  private readSchemaSql(): string {
    const migrationsRoot = path.dirname(
      require.resolve('@packages/migrations/package.json'),
    );
    const schemaPath = path.join(migrationsRoot, 'src/exports/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new DatabaseError(
        `schema.sql not found at ${schemaPath}. Run "pnpm --filter @packages/migrations export" first.`,
      );
    }
    return fs.readFileSync(schemaPath, 'utf8');
  }

  private rewriteSchema(sql: string): string {
    return sql.replaceAll(`${this.sourceSchema}.`, `${this.testSchema}.`);
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.getPool().query(this.rewriteSchema(sql), params);
    return result.rows as T[];
  }

  async queryReadOnly<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    return this.query(sql, params);
  }

  async end(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async createSchema(): Promise<void> {
    const schemaSql = this.readSchemaSql();
    const testSql = schemaSql.replaceAll(this.sourceSchema, this.testSchema);
    const pool = this.getPool();
    await pool.query(`DROP SCHEMA IF EXISTS ${this.testSchema} CASCADE`);
    await pool.query(testSql);
  }

  async dropSchema(): Promise<void> {
    await this.getPool().query(
      `DROP SCHEMA IF EXISTS ${this.testSchema} CASCADE`,
    );
  }

  async truncate(...tables: string[]): Promise<void> {
    const qualified = tables.map((t) => `${this.testSchema}.${t}`).join(', ');
    await this.getPool().query(`TRUNCATE ${qualified} CASCADE`);
  }
}
