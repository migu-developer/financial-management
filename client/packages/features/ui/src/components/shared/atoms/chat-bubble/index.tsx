import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, Text, View, useColorScheme } from 'react-native';
import { isWeb } from '@packages/utils';

import {
  generic,
  neutral,
  primary,
  textTokens,
} from '@features/ui/utils/colors';
import {
  fontSizeScale,
  mediaSize,
  radius,
  space,
} from '@features/ui/utils/spacing';
import {
  ImageLightbox,
  type LightboxOrigin,
} from '@features/ui/components/shared/atoms/image-lightbox';
import { fontWeight } from '@features/ui/utils/typography';

/**
 * An attached photo ALWAYS travels with its accessible description.
 *
 * Modelled as a union rather than two optional props so an unlabeled image is
 * impossible to construct: a receipt photo is content, not decoration, so
 * hiding it from screen readers would lose information, and announcing it with
 * no description would be worse still.
 */
export type ChatBubbleAttachment =
  | {
      /**
       * Either a local blob (the message the user just sent) or a presigned S3
       * GET (a message restored from history) — the bubble does not care which.
       */
      imageUri: string;
      /**
       * DESCRIPTION of the photo — what it is, not what pressing it does.
       *
       * Used for the plain image on mobile and for the expanded image in the
       * lightbox. Kept separate from the expand label on purpose: reusing one
       * string for both made a screen reader announce the already-expanded photo
       * as "Expand the receipt photo", and labelled the mobile thumbnail with an
       * action it does not offer.
       */
      imageAccessibilityLabel: string;
      /** Label for the ACTION of expanding it (the pressable, web only). */
      imageExpandAccessibilityLabel: string;
      /**
       * Accessible label for dismissing the expanded view. Required alongside the
       * image so the lightbox is never opened without a way to describe closing
       * it to a screen reader.
       */
      imageCloseAccessibilityLabel: string;
    }
  | {
      imageUri?: undefined;
      imageAccessibilityLabel?: undefined;
      imageExpandAccessibilityLabel?: undefined;
      imageCloseAccessibilityLabel?: undefined;
    };

export type ChatBubbleProps = {
  message: string;
  timestamp: string;
  isUser: boolean;
} & ChatBubbleAttachment;

export function ChatBubble({
  message,
  timestamp,
  isUser,
  imageUri,
  imageAccessibilityLabel,
  imageExpandAccessibilityLabel,
  imageCloseAccessibilityLabel,
}: ChatBubbleProps) {
  const colorScheme = useColorScheme();
  // Tapping to expand is WEB-only for now, per the current scope. On mobile the
  // thumbnail stays a plain image rather than a control that does nothing.
  const canExpand = useMemo(() => isWeb(), []);
  const [expanded, setExpanded] = useState(false);
  const [origin, setOrigin] = useState<LightboxOrigin | null>(null);
  const thumbnailRef = useRef<Image | null>(null);

  // Measured at press time, not on layout: the drawer scrolls, so a rect cached
  // earlier would animate the photo out of the wrong place.
  const openLightbox = useCallback(() => {
    thumbnailRef.current?.measureInWindow((x, y, width, height) => {
      setOrigin({ x, y, width, height });
      setExpanded(true);
    });
  }, []);
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
          <Pressable
            onPress={canExpand ? openLightbox : undefined}
            disabled={!canExpand}
            {...(canExpand && {
              accessibilityRole: 'button' as const,
              // The ACTION label — the button is what the user activates.
              accessibilityLabel: imageExpandAccessibilityLabel,
            })}
          >
            <Image
              ref={thumbnailRef}
              source={{ uri: imageUri }}
              // `contain` so a tall receipt is never cropped — the whole slip has
              // to stay legible, which is the point of showing it back.
              resizeMode="contain"
              // FIXED width and height, not `width: '100%'`: the bubble is sized
              // by its text, so a percentage made the same photo render wide next
              // to a long caption and narrow next to "ok".
              // Only accessible when it is NOT wrapped in a button: otherwise a
              // screen reader would announce the control and the image inside it.
              accessible={!canExpand}
              {...(!canExpand && {
                accessibilityRole: 'image' as const,
                // The DESCRIPTION — there is no expand action to describe here.
                accessibilityLabel: imageAccessibilityLabel,
              })}
              style={{
                width: mediaSize.chatAttachment.width,
                height: mediaSize.chatAttachment.height,
                borderRadius: radius.md,
                marginBottom: space.xs,
              }}
            />
          </Pressable>
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

      {imageUri && origin ? (
        <ImageLightbox
          visible={expanded}
          uri={imageUri}
          accessibilityLabel={imageAccessibilityLabel}
          closeAccessibilityLabel={imageCloseAccessibilityLabel}
          origin={origin}
          onClose={() => setExpanded(false)}
        />
      ) : null}
    </View>
  );
}
