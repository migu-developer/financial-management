// Sets required Cognito env vars for all tests in @features/auth.
// Must run before any module that imports cognito-config.
process.env.EXPO_PUBLIC_USER_POOL_ID = 'us-east-1_test';
process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID = 'test-client-id';
process.env.EXPO_PUBLIC_COGNITO_DOMAIN =
  'test.auth.us-east-1.amazoncognito.com';
process.env.EXPO_PUBLIC_COGNITO_REGION = 'us-east-1';
