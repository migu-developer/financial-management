function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[CognitoConfig] Missing required environment variable: ${key}`,
    );
  }
  return value;
}

export const cognitoConfig = {
  userPoolId: requireEnv('EXPO_PUBLIC_USER_POOL_ID'),
  clientId: requireEnv('EXPO_PUBLIC_USER_POOL_CLIENT_ID'),
  domain: requireEnv('EXPO_PUBLIC_COGNITO_DOMAIN'),
  region: requireEnv('EXPO_PUBLIC_COGNITO_REGION'),
  // appName is the display name in authenticator apps (e.g. Google Authenticator).
  // A consistent name across environments is intentional — users should see the same
  // service name regardless of which deployment (dev/prod) they registered on.
  appName: 'Financial Management',
} as const;
