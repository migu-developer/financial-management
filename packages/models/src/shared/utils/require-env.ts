/**
 * Fail-fast guard for required environment variables — the single
 * implementation shared by backend Lambdas (handlers/) and the Expo client
 * (module-scope config reads).
 *
 * Callers pass the VALUE (read with literal dot/bracket notation so the
 * bundler can inline it — `process.env[name]` is NOT statically replaced by
 * Metro/esbuild) plus the variable NAME for a useful error message:
 *
 *   const url = requireEnv(process.env.EXPO_PUBLIC_API_URL, 'EXPO_PUBLIC_API_URL');
 *   const arn = requireEnv(process.env['CHAT_STATE_MACHINE_ARN'], 'CHAT_STATE_MACHINE_ARN');
 *
 * A missing variable throws at module init — visible immediately instead of
 * silently running with a wrong default.
 */
export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Environment variable ${name} is not configured.`);
  }
  return value;
}
