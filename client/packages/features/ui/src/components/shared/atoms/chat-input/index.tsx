import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { generic, neutral, primary, surface } from '@features/ui/utils/colors';
import { iconSize, space } from '@features/ui/utils/spacing';
import { TextInputBase } from '@features/ui/components/shared/atoms/text-input-base';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { ColorScheme } from '@features/ui/utils/constants';

export interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onCamera: () => void;
  onMic: () => void;
  placeholder: string;
  cameraLabel?: string;
  micLabel?: string;
  sendLabel?: string;
}

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onCamera,
  onMic,
  placeholder,
  cameraLabel = 'Camera',
  micLabel = 'Microphone',
  sendLabel = 'Send',
}: ChatInputProps) {
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;

  const backgroundColor = isDark ? surface.dark.card : surface.light.card;
  const borderColor = isDark ? surface.dark.border : surface.light.border;
  const actionIconColor = isDark ? neutral[400] : neutral[500];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: space.sm,
        paddingVertical: space.xs,
        backgroundColor,
        borderTopWidth: 1,
        borderTopColor: borderColor,
        gap: space.xs,
      }}
    >
      <TouchableOpacity
        onPress={onCamera}
        accessibilityRole="button"
        accessibilityLabel={cameraLabel}
        style={{ padding: space.s4 }}
      >
        <MaterialCommunityIcons
          name="camera"
          size={iconSize.lg}
          color={actionIconColor}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onMic}
        accessibilityRole="button"
        accessibilityLabel={micLabel}
        style={{ padding: space.s4 }}
      >
        <MaterialCommunityIcons
          name="microphone"
          size={iconSize.lg}
          color={actionIconColor}
        />
      </TouchableOpacity>

      <TextInputBase
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline
        style={{ flex: 1, maxHeight: 100 }}
      />

      <TouchableOpacity
        onPress={onSend}
        disabled={!value.trim()}
        accessibilityRole="button"
        accessibilityLabel={sendLabel}
        style={{
          padding: space.xs,
          borderRadius: space.xl,
          backgroundColor: value.trim() ? primary[600] : neutral[300],
        }}
      >
        <MaterialCommunityIcons
          name="send"
          size={iconSize.md}
          color={generic.white}
        />
      </TouchableOpacity>
    </View>
  );
}
