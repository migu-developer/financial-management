import path from 'path';
import fs from 'fs';
import { config as loadEnv } from 'dotenv';

const NODE_ENV = process.env.NODE_ENV ?? 'defaults';

/**
 * Finds the project root that contains the shared config folder (config/.env.*).
 * Searches upward from __dirname and process.cwd() so it works when running from
 * packages/transactional, from .react-email during next build, or from monorepo root.
 */
function findConfigRoot(): string {
  const envFile = `.env.${NODE_ENV}`;
  const fallbackEnvFile = '.env.defaults';

  function dirHasConfig(dir: string): boolean {
    const configDir = path.join(dir, 'config');
    return (
      fs.existsSync(path.join(configDir, envFile)) ||
      fs.existsSync(path.join(configDir, fallbackEnvFile))
    );
  }

  function searchUp(fromDir: string): string | null {
    let current = path.resolve(fromDir);
    const root = path.parse(current).root;
    while (current !== root) {
      if (dirHasConfig(current)) return current;
      current = path.dirname(current);
    }
    return null;
  }

  // Try from __dirname first (e.g. packages/transactional/config or .next/server/...)
  const fromDirname = searchUp(__dirname);
  if (fromDirname) return fromDirname;

  // Then from process.cwd() (e.g. packages/transactional or .react-email)
  const fromCwd = searchUp(process.cwd());
  if (fromCwd) return fromCwd;

  // Fallback: assume monorepo root is 3 levels up from transactional/config
  const fallback = path.resolve(__dirname, '../../../');
  if (dirHasConfig(fallback)) return fallback;

  throw new Error(
    `[@packages/transactional/config] Could not find config root (directory containing config/.env.*). ` +
      `Searched from __dirname=${__dirname} and cwd=${process.cwd()}`,
  );
}

const configRoot = findConfigRoot();
const envPath = path.join(configRoot, 'config', `.env.${NODE_ENV}`);
const envPathFallback = path.join(configRoot, 'config', '.env.defaults');

const resolvedPath = fs.existsSync(envPath) ? envPath : envPathFallback;
loadEnv({ path: resolvedPath });

export const config: Record<string, string> = {
  NODE_ENV,
  ...(process.env as Record<string, string>),
};
