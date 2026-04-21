---
name: cognito-identity-js-6.3
description: |
  amazon-cognito-identity-js 6.3 patterns for Cognito authentication.
  TRIGGER when: implementing user authentication, sign-up, sign-in,
  token refresh, or session management with Cognito.
metadata:
  version: '6.3.16'
  catalog_ref: 'amazon-cognito-identity-js: ^6.3.16'
  scope: [client]
  auto_invoke: 'When implementing Cognito authentication flows'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# amazon-cognito-identity-js 6.3

## Version

amazon-cognito-identity-js@6.3.16 (from pnpm catalog)

## Critical Patterns

- Use `CognitoUserPool` to configure the user pool connection
- Use `CognitoUser` for user operations (sign-in, sign-up, password reset)
- Use `AuthenticationDetails` for credentials during sign-in
- The API is callback-based -- wrap in Promises for async/await usage
- Use a custom `Storage` adapter for React Native (expo-secure-store)
- Store tokens securely using `expo-secure-store`, never AsyncStorage
- Handle MFA challenges in the `mfaRequired` callback
- Always check session validity before API calls: `getSession()`
- Refresh tokens automatically using `cognitoUser.refreshSession()`
- Pool config comes from environment variables, not hardcoded

## Must NOT Do

- NEVER hardcode UserPoolId or ClientId in source code -- use environment variables
- NEVER store tokens in AsyncStorage -- use expo-secure-store via custom Storage
- NEVER ignore MFA callbacks -- always handle `mfaRequired` and `newPasswordRequired`
- NEVER assume tokens are valid -- check expiry or call `getSession()`
- NEVER use this library on the server side -- use `@aws-sdk/client-cognito-identity-provider`
- NEVER log tokens or credentials
- NEVER skip error handling in authentication callbacks

## Examples

### User Pool configuration

```typescript
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  ICognitoStorage,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env['EXPO_PUBLIC_COGNITO_USER_POOL_ID'] ?? '',
  ClientId: process.env['EXPO_PUBLIC_COGNITO_CLIENT_ID'] ?? '',
  Storage: secureStorage, // custom adapter
};

const userPool = new CognitoUserPool(poolData);
```

### Custom Storage adapter (in-memory cache + AsyncStorage)

The Cognito SDK calls getItem/setItem **synchronously**, but AsyncStorage is
async. This project bridges the gap with an in-memory cache hydrated at startup:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export class CognitoStorageAdapter implements Storage {
  private cache = new Map<string, string>();

  // MUST be called and awaited before creating CognitoUserPool
  async hydrate(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const cognitoKeys = allKeys.filter((k) =>
      k.startsWith('CognitoIdentityServiceProvider.'),
    );
    const pairs = await AsyncStorage.multiGet(cognitoKeys);
    for (const [key, value] of pairs) {
      if (value !== null) this.cache.set(key, value);
    }
  }

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null; // sync read from cache
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value); // sync write to cache
    void AsyncStorage.setItem(key, value).catch(() => {}); // async persist
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    void AsyncStorage.removeItem(key).catch(() => {});
  }
}
```

### Sign-in wrapped as Promise

```typescript
function signIn(email: string, password: string): Promise<CognitoUserSession> {
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
    Storage: secureStorage,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(err),
      mfaRequired: (challengeName, challengeParameters) => {
        // Store cognitoUser reference for MFA verification step
        reject(new MfaRequiredError(cognitoUser, challengeName));
      },
      newPasswordRequired: (userAttributes) => {
        reject(new NewPasswordRequiredError(cognitoUser, userAttributes));
      },
    });
  });
}
```

### Get current session

```typescript
function getCurrentSession(): Promise<CognitoUserSession | null> {
  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    cognitoUser.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(session);
      },
    );
  });
}
```

### Sign out and token access

```typescript
function signOut(): void {
  const cognitoUser = userPool.getCurrentUser();
  cognitoUser?.signOut();
}

function getAccessToken(session: CognitoUserSession): string {
  return session.getAccessToken().getJwtToken();
}

function getIdTokenClaims(
  session: CognitoUserSession,
): Record<string, unknown> {
  return session.getIdToken().decodePayload();
}
```
