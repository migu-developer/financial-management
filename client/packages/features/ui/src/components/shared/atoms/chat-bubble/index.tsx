import React from 'react';
import { Text, View, useColorScheme } from 'react-native';

import {
  generic,
  neutral,
  primary,
  textTokens,
} from '@features/ui/utils/colors';
import { fontSizeScale, radius, space } from '@features/ui/utils/spacing';
import { fontWeight } from '@features/ui/utils/typography';

export interface ChatBubbleProps {
  message: string;
  timestamp: string;
  isUser: boolean;
}

export function ChatBubble({ message, timestamp, isUser }: ChatBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bubbleBackground = isUser
    ? primary[600]
    : isDark
      ? neutral[700]
      : neutral[200];

  const messageColor = isUser
    ? generic.white
    : isDark
      ? textTokens.dark.primary
      : textTokens.light.primary;

  const timestampColor = isUser
    ? generic.white
    : isDark
      ? textTokens.dark.muted
      : textTokens.light.muted;

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        marginBottom: space.xs,
        marginHorizontal: space.md,
      }}
    >
      <View
        style={{
          backgroundColor: bubbleBackground,
          borderRadius: radius.lg,
          paddingHorizontal: space.sm,
          paddingVertical: space.xs,
        }}
      >
        <Text
          style={{
            fontSize: fontSizeScale.sm,
            fontWeight: fontWeight.normal,
            color: messageColor,
          }}
        >
          {message}
        </Text>
        <Text
          style={{
            fontSize: fontSizeScale['2xs'],
            color: timestampColor,
            marginTop: space.s4,
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            opacity: isUser ? 0.8 : 1,
          }}
        >
          {timestamp}
        </Text>
      </View>
    </View>
  );
}
