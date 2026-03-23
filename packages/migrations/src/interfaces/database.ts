export interface MigrationRecord {
  id: string;
  version: string;
  description: string | null;
  executed_at: Date;
  execution_time: number | null;
  checksum: string | null;
  success: boolean;
}

export interface DatabaseConfig {
  connectionString: string;
  schema: string;
}
