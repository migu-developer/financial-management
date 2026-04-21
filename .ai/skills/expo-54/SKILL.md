---
name: expo-54
description: |
  Expo SDK 54 patterns with expo-router file-based routing and modern APIs.
  TRIGGER when: configuring app.config.ts, creating routes in the app/ directory,
  using Expo modules, or managing navigation.
metadata:
  version: '54.0.33'
  catalog_ref: 'expo: ~54.0.33'
  scope: [client]
  auto_invoke: 'When working with Expo configuration, routing, or Expo modules'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# Expo SDK 54

## Version

expo@54.0.33 (from pnpm catalog), expo-router@6.0.23

## Critical Patterns

- File-based routing with expo-router v6 in the `app/` directory
- Use `app.config.ts` (not app.json) for dynamic configuration
- Use typed routes: `<Link href="/profile/[id]">` with type-safe params
- Use `expo-secure-store` for sensitive data (tokens, credentials) -- never AsyncStorage
- Use `expo-image` instead of RN's Image component
- Use `expo-router` `<Stack>`, `<Tabs>`, `<Drawer>` layout components
- Use `useLocalSearchParams()` for typed route parameters
- Use `router.push()`, `router.replace()`, `router.back()` for imperative navigation
- Use `_layout.tsx` files for layout definitions at each route level
- Precompiled iOS builds (XCFrameworks) are default in SDK 54 for faster builds
- React 19.1.0 is the expected React version

## Must NOT Do

- NEVER use `app.json` for configuration -- use `app.config.ts`
- NEVER store tokens or secrets in `AsyncStorage` -- use `expo-secure-store`
- NEVER use `@react-navigation/native` directly -- use `expo-router` which wraps it
- NEVER use manual route registration -- file-based routing handles it
- NEVER put screen components outside the `app/` directory for routing
- NEVER use `require()` for images in Expo -- use `import` or `expo-image` with URI
- NEVER hardcode app version -- derive from `app.config.ts`

## File-Based Routing Structure

```
app/
  _layout.tsx          -- root layout (Stack, Tabs, or Drawer)
  index.tsx            -- "/" route
  (auth)/
    _layout.tsx        -- auth group layout
    sign-in.tsx        -- "/sign-in" route
    sign-up.tsx        -- "/sign-up" route
  (tabs)/
    _layout.tsx        -- tab navigator layout
    home.tsx           -- "/home" tab
    settings.tsx       -- "/settings" tab
  profile/
    [id].tsx           -- "/profile/:id" dynamic route
  +not-found.tsx       -- 404 fallback
```

## Examples

### app.config.ts pattern

```typescript
import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Financial Management',
  slug: 'financial-management',
  scheme: 'finmgmt',
  newArchEnabled: true,
  experiments: {
    typedRoutes: true,
  },
  plugins: ['expo-router', 'expo-secure-store'],
});
```

### Root layout with Stack

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
```

### Tab layout

```tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
```

### Typed navigation

```tsx
import { Link, useLocalSearchParams, router } from 'expo-router';

function ProfileLink() {
  return <Link href="/profile/123">View Profile</Link>;
}

function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>Profile: {id}</Text>;
}

// Imperative navigation
function navigateToProfile(id: string) {
  router.push(`/profile/${id}`);
}
```

### Secure storage for tokens

```tsx
import * as SecureStore from 'expo-secure-store';

async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('auth_token', token);
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}

async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
}
```
