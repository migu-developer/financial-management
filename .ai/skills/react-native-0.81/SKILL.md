---
name: react-native-0.81
description: |
  React Native 0.81 patterns with New Architecture enabled.
  TRIGGER when: creating or editing React Native components, using platform-specific
  code, or working with native modules.
metadata:
  version: '0.81.5'
  catalog_ref: 'react-native: 0.81.5'
  scope: [client]
  auto_invoke: 'When writing React Native components or platform-specific code'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# React Native 0.81

## Version

react-native@0.81.5 (from pnpm catalog)

## Critical Patterns

- New Architecture is enabled by default -- all components use Fabric renderer
- Use platform-specific file extensions: `.ios.tsx`, `.android.tsx`, `.web.tsx`
- Use `react-native-safe-area-context` instead of the deprecated `SafeAreaView` from RN
- All layout uses Flexbox -- `flexDirection` defaults to `column` (not `row`)
- Use `expo-image` instead of RN's `Image` component for better caching and formats
- Use Hermes as the JavaScript engine (default in 0.81, JSC removed)
- Use `react-native-reanimated` for performant animations on the UI thread
- Use `react-native-gesture-handler` for gesture recognition
- Edge-to-edge is supported on Android via `edgeToEdgeEnabled` Gradle property
- Precompiled iOS builds reduce build times significantly

## Must NOT Do

- NEVER use DOM APIs (document, window, innerHTML) -- they do not exist in RN
- NEVER use `<div>`, `<span>`, `<p>` -- use `<View>`, `<Text>`, `<Pressable>`
- NEVER use CSS properties that do not exist in RN (float, grid, display: block)
- NEVER use the deprecated `SafeAreaView` from react-native -- use `react-native-safe-area-context`
- NEVER use RN's `Image` component -- use `expo-image` (better caching, AVIF, WebP)
- NEVER use `Animated` from react-native -- use `react-native-reanimated`
- NEVER use `TouchableOpacity` / `TouchableHighlight` -- use `Pressable`
- NEVER use JavaScriptCore (removed in 0.81) -- Hermes is the only engine
- NEVER use inline styles for shared styling -- use NativeWind className
- NEVER import from `react-native-web` directly in shared code

## Platform-Specific Files

```
Component.tsx         -- shared (default)
Component.ios.tsx     -- iOS only
Component.android.tsx -- Android only
Component.web.tsx     -- Web only
```

Metro resolves the correct file automatically based on the target platform.

## Examples

### Safe area usage

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

function Screen({ children }: { children: React.ReactNode }) {
  return <SafeAreaView className="flex-1 bg-white">{children}</SafeAreaView>;
}
```

### Use expo-image instead of Image

```tsx
import { Image } from 'expo-image';

function Avatar({ uri }: { uri: string }) {
  return (
    <Image
      source={{ uri }}
      className="h-12 w-12 rounded-full"
      contentFit="cover"
      placeholder={{ blurhash: 'LEHV6nWB2yk8' }}
      transition={200}
    />
  );
}
```

### Pressable instead of TouchableOpacity

```tsx
import { Pressable, Text } from 'react-native';

function Button({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-lg bg-primary-500 px-4 py-3 active:opacity-80"
    >
      <Text className="text-center font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
```

### Reanimated for animations

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

function AnimatedBox() {
  const offset = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(offset.value) }],
  }));

  return (
    <Animated.View style={animatedStyle} className="h-20 w-20 bg-blue-500" />
  );
}
```

### Platform detection when needed

```tsx
import { Platform } from 'react-native';

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  android: { elevation: 4 },
  default: {},
});
```
