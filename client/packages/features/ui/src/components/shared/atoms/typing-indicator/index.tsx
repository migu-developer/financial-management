import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View, useColorScheme } from 'react-native';

import { neutral } from '@features/ui/utils/colors';
import { radius, space } from '@features/ui/utils/spacing';

export interface TypingIndicatorProps {
  /** Accessibility label announced by screen readers (e.g. "Assistant is typing"). */
  accessibilityLabel: string;
}

const DOT_COUNT = 3;
const DURATION = 400;

/**
 * Animated "assistant is typing" indicator. Renders three pulsing dots
 * inside an assistant-style bubble so it reads as the bot composing a reply,
 * replacing a plain "Processing…" label.
 */
export function TypingIndicator({ accessibilityLabel }: TypingIndicatorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bubbleBackground = isDark ? neutral[700] : neutral[200];
  const dotColor = isDark ? neutral[400] : neutral[500];

  // One Animated.Value per dot, staggered so the pulse travels left → right.
  const dots = useMemo(
    () => Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.3)),
    [],
  );
  const animationsRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const loops = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * (DURATION / 2)),
          Animated.timing(dot, {
            toValue: 1,
            duration: DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: DURATION,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    const animation = Animated.parallel(loops);
    animationsRef.current = animation;
    animation.start();

    return () => {
      animation.stop();
    };
  }, [dots]);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={{
        alignSelf: 'flex-start',
        marginBottom: space.xs,
        marginHorizontal: space.md,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.s4,
          backgroundColor: bubbleBackground,
          borderRadius: radius.lg,
          paddingHorizontal: space.sm,
          paddingVertical: space.sm,
        }}
      >
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={{
              width: space.xs,
              height: space.xs,
              borderRadius: radius.sm,
              backgroundColor: dotColor,
              opacity: dot,
            }}
          />
        ))}
      </View>
    </View>
  );
}
