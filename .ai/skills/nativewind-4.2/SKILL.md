---
name: nativewind-4.2
description: |
  NativeWind 4.2 patterns for Tailwind CSS className prop on React Native.
  TRIGGER when: styling React Native components, using className prop,
  or configuring NativeWind/Tailwind for mobile.
metadata:
  version: '4.2.3'
  catalog_ref: 'nativewind: ^4.2.3'
  scope: [client]
  auto_invoke: 'When styling React Native components with className'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# NativeWind 4.2

## Version

nativewind@4.2.3 (from pnpm catalog)

## Critical Patterns

- Use `className` prop on all RN components -- NativeWind's JSX transform handles it
- NativeWind compiles Tailwind classes to React Native StyleSheet objects at build time
- The `className` type augmentation comes from `nativewind-env.d.ts` referencing `nativewind/types`
- All peer dependencies (react, react-native) must resolve to the SAME pnpm virtual store entry
- Use `dark:` prefix for dark mode classes
- Use `platform:` modifiers when needed: `ios:`, `android:`, `web:`
- Use `active:` for press states on Pressable components
- NativeWind works via JSX transform -- no wrappers or HOCs needed for RN core components
- Third-party components need `cssInterop()` or `remapProps()` to support className

## Must NOT Do

- NEVER use inline `style` prop when a Tailwind class exists for the same property
- NEVER mix inline styles and className for the same property (className wins)
- NEVER use CSS units (px, rem, em, vh) -- NativeWind converts to density-independent pixels
- NEVER use CSS Grid classes -- React Native only supports Flexbox
- NEVER use `float`, `position: fixed`, `display: block/inline` classes
- NEVER use `hover:` on mobile (no hover on touch devices) -- use `active:` instead
- NEVER manually create `.nativewind-types.d.ts` files -- rely on `nativewind-env.d.ts`
- NEVER use different react versions across packages (causes className type loss)

## Known Monorepo Issue

If `className` TypeScript errors appear, check that all packages resolve react-native
to the same pnpm virtual store entry:

```bash
readlink client/packages/features/*/node_modules/react-native
```

All must point to the same `_react@19.1.5` entry. Fix by using `"react": "catalog:"`
in peerDependencies of feature packages.

## Examples

### Basic component styling

```tsx
import { View, Text } from 'react-native';

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-2xl bg-white p-4 shadow-md dark:bg-gray-800">
      <Text className="text-lg font-bold text-gray-900 dark:text-white">
        {title}
      </Text>
      {children}
    </View>
  );
}
```

### Dark mode

```tsx
<View className="bg-white dark:bg-gray-900">
  <Text className="text-black dark:text-white">Adapts to theme</Text>
</View>
```

### Platform-specific classes

```tsx
<View className="p-4 ios:pb-8 android:pb-4">
  <Text className="text-base ios:text-lg">Platform text</Text>
</View>
```

### Press state with active:

```tsx
import { Pressable, Text } from 'react-native';

<Pressable className="rounded-lg bg-blue-600 px-6 py-3 active:bg-blue-700">
  <Text className="text-center font-semibold text-white">Press Me</Text>
</Pressable>;
```

### Responsive spacing

```tsx
<View className="mx-4 sm:mx-8 lg:mx-16">
  <Text className="text-sm sm:text-base lg:text-lg">Responsive</Text>
</View>
```

### cssInterop for third-party components

```tsx
import { cssInterop } from 'nativewind';
import { MaskedView } from '@react-native-masked-view/masked-view';

cssInterop(MaskedView, { className: 'style' });

// Now MaskedView accepts className
<MaskedView className="flex-1" />;
```

## nativewind-env.d.ts (required in client/main)

```typescript
/// <reference types="nativewind/types" />
```

This single line augments all RN component types with `className`.
