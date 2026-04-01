export abstract class DatabaseService {
  abstract query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  abstract queryReadOnly<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  abstract end(): Promise<void>;
}
