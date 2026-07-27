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
  /**
   * Rendered above the input row — the attachment chip while one is being
   * prepared, uploaded or is ready. A slot keeps this atom free of any
   * attachment state or i18n.
   */
  attachmentSlot?: React.ReactNode;
  /**
   * Blocks Send while an attachment is still being processed, and allows
   * sending a photo with NO caption once it is ready.
   */
  canSend?: boolean;
  /** Hides the camera / mic actions on platforms where they are unavailable. */
  showCamera?: boolean;
  showMic?: boolean;
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
  attachmentSlot,
  canSend,
  showCamera = true,
  showMic = true,
}: ChatInputProps) {
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;

  const backgroundColor = isDark ? surface.dark.card : surface.light.card;
  const borderColor = isDark ? surface.dark.border : surface.light.border;
  const actionIconColor = isDark ? neutral[400] : neutral[500];

  // Defaults to the old text-only rule, so callers that pass nothing keep
  // working. With an attachment, a photo alone is a valid message.
  const sendEnabled = canSend ?? Boolean(value.trim());

  return (
    <View
      style={{
        backgroundColor,
        borderTopWidth: 1,
        borderTopColor: borderColor,
      }}
    >
      {attachmentSlot ? (
        <View style={{ paddingTop: space.xs }}>{attachmentSlot}</View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space.sm,
          paddingVertical: space.xs,
          gap: space.xs,
        }}
      >
        {showCamera ? (
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
        ) : null}

        {showMic ? (
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
        ) : null}

        <TextInputBase
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline
          style={{ flex: 1, maxHeight: 100 }}
        />

        <TouchableOpacity
          onPress={onSend}
          disabled={!sendEnabled}
          accessibilityRole="button"
          accessibilityLabel={sendLabel}
          accessibilityState={{ disabled: !sendEnabled }}
          style={{
            padding: space.xs,
            borderRadius: space.xl,
            backgroundColor: sendEnabled ? primary[600] : neutral[300],
          }}
        >
          <MaterialCommunityIcons
            name="send"
            size={iconSize.md}
            color={generic.white}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
