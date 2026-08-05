import React from 'react';
import { Image, Text, View, useColorScheme } from 'react-native';

import {
  generic,
  neutral,
  primary,
  textTokens,
} from '@features/ui/utils/colors';
import {
  fontSizeScale,
  mediaHeight,
  radius,
  space,
} from '@features/ui/utils/spacing';
import { fontWeight } from '@features/ui/utils/typography';

export interface ChatBubbleProps {
  message: string;
  timestamp: string;
  isUser: boolean;
  /**
   * Renders an attached photo above the text.
   *
   * Either a local blob (the message the user just sent) or a presigned S3 GET
   * (a message restored from history) — the bubble does not care which.
   */
  imageUri?: string;
  /** Accessible description of `imageUri`. Required whenever one is passed. */
  imageAccessibilityLabel?: string;
}

export function ChatBubble({
  message,
  timestamp,
  isUser,
  imageUri,
  imageAccessibilityLabel,
}: ChatBubbleProps) {
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
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            // `contain` so a tall receipt is never cropped — the whole slip has
            // to stay legible, which is the point of showing it back.
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            {...(imageAccessibilityLabel !== undefined && {
              accessibilityLabel: imageAccessibilityLabel,
            })}
            style={{
              width: '100%',
              height: mediaHeight.chatAttachment,
              borderRadius: radius.md,
              marginBottom: space.xs,
            }}
          />
        ) : null}
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
