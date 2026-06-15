import React from 'react';
import { Text, TouchableOpacity, View, useColorScheme } from 'react-native';

import { generic, neutral, primary, surface } from '@features/ui/utils/colors';
import { fontSizeScale, radius, space } from '@features/ui/utils/spacing';
import { fontWeight } from '@features/ui/utils/typography';

export interface ChatPreviewActionsProps {
  /** Disable the buttons after the user has chosen (avoids double-clicks). */
  disabled?: boolean;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Action row rendered beneath a Human-in-the-Loop preview message. Tapping
 * either button triggers the `POST /chat/confirm` callback so the paused
 * Step Function execution resumes.
 */
export function ChatPreviewActions({
  disabled,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ChatPreviewActionsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const cancelBg = isDark ? surface.dark.card : neutral[200];
  const cancelColor = isDark ? generic.white : neutral[700];

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: space.xs,
        marginTop: space.xs,
        marginBottom: space.sm,
        marginHorizontal: space.md,
        alignSelf: 'flex-start',
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={confirmLabel}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onConfirm}
        style={{
          backgroundColor: primary[600],
          paddingHorizontal: space.md,
          paddingVertical: space.xs,
          borderRadius: radius.md,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            color: generic.white,
            fontSize: fontSizeScale.sm,
            fontWeight: fontWeight.semibold,
          }}
        >
          {confirmLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onCancel}
        style={{
          backgroundColor: cancelBg,
          paddingHorizontal: space.md,
          paddingVertical: space.xs,
          borderRadius: radius.md,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            color: cancelColor,
            fontSize: fontSizeScale.sm,
            fontWeight: fontWeight.semibold,
          }}
        >
          {cancelLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
