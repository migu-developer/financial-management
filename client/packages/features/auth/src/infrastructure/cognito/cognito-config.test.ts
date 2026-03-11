describe('cognitoConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_USER_POOL_ID: 'us-east-1_test',
      EXPO_PUBLIC_USER_POOL_CLIENT_ID: 'test-client-id',
      EXPO_PUBLIC_COGNITO_DOMAIN: 'test.auth.us-east-1.amazoncognito.com',
      EXPO_PUBLIC_COGNITO_REGION: 'us-east-1',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads all env vars correctly', async () => {
    const { cognitoConfig } = await import('./cognito-config');
    expect(cognitoConfig.userPoolId).toBe('us-east-1_test');
    expect(cognitoConfig.clientId).toBe('test-client-id');
    expect(cognitoConfig.domain).toBe('test.auth.us-east-1.amazoncognito.com');
    expect(cognitoConfig.region).toBe('us-east-1');
  });

  it('throws when region is absent', async () => {
    delete process.env.EXPO_PUBLIC_COGNITO_REGION;
    await expect(import('./cognito-config')).rejects.toThrow(
      'Missing required environment variable: EXPO_PUBLIC_COGNITO_REGION',
    );
  });

  it('appName is always Financial Management', async () => {
    const { cognitoConfig } = await import('./cognito-config');
    expect(cognitoConfig.appName).toBe('Financial Management');
  });

  it('throws on missing EXPO_PUBLIC_USER_POOL_ID', async () => {
    delete process.env.EXPO_PUBLIC_USER_POOL_ID;
    await expect(import('./cognito-config')).rejects.toThrow(
      'Missing required environment variable: EXPO_PUBLIC_USER_POOL_ID',
    );
  });

  it('throws on missing EXPO_PUBLIC_USER_POOL_CLIENT_ID', async () => {
    delete process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID;
    await expect(import('./cognito-config')).rejects.toThrow(
      'Missing required environment variable: EXPO_PUBLIC_USER_POOL_CLIENT_ID',
    );
  });

  it('throws on missing EXPO_PUBLIC_COGNITO_DOMAIN', async () => {
    delete process.env.EXPO_PUBLIC_COGNITO_DOMAIN;
    await expect(import('./cognito-config')).rejects.toThrow(
      'Missing required environment variable: EXPO_PUBLIC_COGNITO_DOMAIN',
    );
  });
});
