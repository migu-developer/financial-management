import React from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { generic, neutral, primary, surface } from '@features/ui/utils/colors';
import {
  fontSizeScale,
  iconSize,
  radius,
  space,
} from '@features/ui/utils/spacing';
import { fontWeight } from '@features/ui/utils/typography';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { ColorScheme } from '@features/ui/utils/constants';

/** Mirrors the attachment lifecycle owned by `useChatAttachment`. */
export type AttachmentPreviewStatus =
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error';

export interface AttachmentPreviewProps {
  /** Local object URL for the thumbnail. */
  previewUri?: string;
  fileName?: string;
  status: AttachmentPreviewStatus;
  /** Already-localized status line, e.g. "Preparing image…". */
  statusLabel: string;
  /** Already-localized message shown when `status === 'error'`. */
  errorMessage?: string;
  onRemove: () => void;
  /** Already-localized accessibility label for the remove control. */
  removeLabel: string;
}

const THUMBNAIL_SIZE = 44;

/**
 * Chip shown above the chat input while an attachment is being prepared,
 * uploaded, normalized, or is ready to send.
 *
 * Purely presentational: every string arrives already localized, so the atom
 * carries no i18n dependency and stays reusable outside the chat.
 */
export function AttachmentPreview({
  previewUri,
  fileName,
  status,
  statusLabel,
  errorMessage,
  onRemove,
  removeLabel,
}: AttachmentPreviewProps) {
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;

  const isError = status === 'error';
  const inFlight =
    status === 'preparing' || status === 'uploading' || status === 'processing';

  const backgroundColor = isDark ? surface.dark.card : surface.light.card;
  const borderColor = isError
    ? generic.error
    : isDark
      ? surface.dark.border
      : surface.light.border;
  const primaryTextColor = isDark ? neutral[100] : neutral[800];
  const secondaryTextColor = isError
    ? generic.error
    : isDark
      ? neutral[400]
      : neutral[500];

  return (
    <View
      accessibilityRole="summary"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        marginHorizontal: space.sm,
        marginBottom: space.xs,
        padding: space.xs,
        backgroundColor,
        borderWidth: 1,
        borderColor,
        borderRadius: radius.lg,
      }}
    >
      {previewUri ? (
        <Image
          source={{ uri: previewUri }}
          accessibilityIgnoresInvertColors
          style={{
            width: THUMBNAIL_SIZE,
            height: THUMBNAIL_SIZE,
            borderRadius: radius.md,
          }}
        />
      ) : (
        <View
          style={{
            width: THUMBNAIL_SIZE,
            height: THUMBNAIL_SIZE,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? neutral[700] : neutral[200],
          }}
        >
          <MaterialCommunityIcons
            name="image-outline"
            size={iconSize.md}
            color={secondaryTextColor}
          />
        </View>
      )}

      <View style={{ flex: 1 }}>
        {fileName ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: fontSizeScale.sm,
              fontWeight: fontWeight.medium,
              color: primaryTextColor,
            }}
          >
            {fileName}
          </Text>
        ) : null}
        <Text
          numberOfLines={2}
          style={{
            fontSize: fontSizeScale.xs,
            color: secondaryTextColor,
          }}
        >
          {isError && errorMessage ? errorMessage : statusLabel}
        </Text>
      </View>

      {inFlight ? (
        <ActivityIndicator size="small" color={primary[600]} />
      ) : null}

      <TouchableOpacity
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={removeLabel}
        style={{ padding: space.s4 }}
      >
        <MaterialCommunityIcons
          name="close"
          size={iconSize.md}
          color={secondaryTextColor}
        />
      </TouchableOpacity>
    </View>
  );
}
