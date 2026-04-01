import path from 'node:path';
import dotenv from 'dotenv';
import type { DatabaseConfig } from './interfaces/database';

export interface AppConfig {
  db: DatabaseConfig;
  migrationsDir: string;
}

// Package root: packages/migrations/ (one level up from src/)
const packageRoot = path.resolve(__dirname, '..');

export function loadConfig(env?: string): AppConfig {
  // Load .env.{env} from the package directory as fallback.
  // In practice, direnv populates process.env before the CLI runs.
  const envFile = env
    ? path.resolve(packageRoot, `.env.${env}`)
    : path.resolve(packageRoot, '.env.local');

  dotenv.config({ path: envFile });

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      `DATABASE_URL not set. Looked in: ${envFile}\n` +
        'Ensure DATABASE_URL is defined in your .env file or loaded via direnv.',
    );
  }

  const schema = process.env.DATABASE_SCHEMA || 'financial_management';

  return {
    db: { connectionString, schema },
    migrationsDir: path.resolve(__dirname, 'migrations'),
  };
}
