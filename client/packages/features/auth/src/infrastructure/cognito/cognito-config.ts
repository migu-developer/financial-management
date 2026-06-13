import { requireEnv } from '@packages/models/shared/utils/require-env';

// NOTE: process.env[dynamicKey] is NOT statically replaced by Metro/webpack at build time.
// Each variable MUST be accessed via literal dot notation so the bundler can inline the value.
export const cognitoConfig = {
  userPoolId: requireEnv(
    process.env.EXPO_PUBLIC_USER_POOL_ID,
    'EXPO_PUBLIC_USER_POOL_ID',
  ),
  clientId: requireEnv(
    process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID,
    'EXPO_PUBLIC_USER_POOL_CLIENT_ID',
  ),
  domain: requireEnv(
    process.env.EXPO_PUBLIC_COGNITO_DOMAIN,
    'EXPO_PUBLIC_COGNITO_DOMAIN',
  ),
  region: requireEnv(
    process.env.EXPO_PUBLIC_COGNITO_REGION,
    'EXPO_PUBLIC_COGNITO_REGION',
  ),
  // appName is the display name in authenticator apps (e.g. Google Authenticator).
  // A consistent name across environments is intentional — users should see the same
  // service name regardless of which deployment (dev/prod) they registered on.
  appName: 'Financial Management',
} as const;
