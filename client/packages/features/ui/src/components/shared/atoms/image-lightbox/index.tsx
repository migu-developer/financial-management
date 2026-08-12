import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal as RNModal,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import { rgba } from '@features/ui/utils/colors';
import { lightboxInset, radius } from '@features/ui/utils/spacing';

/** Where the thumbnail sits on screen, in window coordinates. */
export interface LightboxOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageLightboxProps {
  visible: boolean;
  uri: string;
  /** Accessible description of the photo (same one the thumbnail carries). */
  accessibilityLabel: string;
  /** Accessible label for the tap-to-dismiss backdrop. */
  closeAccessibilityLabel: string;
  /**
   * Rect of the thumbnail that was pressed. The image grows OUT of it, which is
   * what makes the expansion feel like the same object moving rather than a new
   * panel appearing.
   */
  origin: LightboxOrigin;
  onClose: () => void;
}

/** Grow: quick to leave the thumbnail, then settles. */
const OPEN_MS = 260;
/** Shrink: slightly faster — a dismissal should not feel laboured. */
const CLOSE_MS = 200;

/**
 * Full-screen view of a chat attachment, expanding from its thumbnail.
 *
 * The transition interpolates the image's own rect from the thumbnail's position
 * to a centered one, so nothing cross-fades or pops: the photo appears to travel.
 * `Easing.out(cubic)` on the way out and `Easing.in(cubic)` on the way back give
 * the asymmetry real motion has — decelerating into place, accelerating away.
 *
 * `useNativeDriver` is false because the animated properties are layout
 * (`top`/`left`/`width`/`height`); the native driver only handles transforms and
 * opacity. On web that distinction does not exist anyway.
 */
export function ImageLightbox({
  visible,
  uri,
  accessibilityLabel,
  closeAccessibilityLabel,
  origin,
  onClose,
}: ImageLightboxProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  // Kept mounted through the closing animation: unmounting on `visible: false`
  // would make the photo vanish instantly instead of shrinking back.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, progress]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  if (!mounted) return null;

  const targetWidth = Math.max(screenWidth - lightboxInset * 2, origin.width);
  const targetHeight = Math.max(
    screenHeight - lightboxInset * 2,
    origin.height,
  );

  const between = (from: number, to: number) =>
    progress.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <RNModal
      visible
      transparent
      // Suppressed: the shared-element animation below IS the transition, and
      // RNModal's own fade would run on top of it and muddy the motion.
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: rgba.black50,
          opacity: progress,
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={closeAccessibilityLabel}
        >
          <Animated.Image
            source={{ uri }}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
            style={{
              position: 'absolute',
              left: between(origin.x, (screenWidth - targetWidth) / 2),
              top: between(origin.y, (screenHeight - targetHeight) / 2),
              width: between(origin.width, targetWidth),
              height: between(origin.height, targetHeight),
              // Rounded like the thumbnail, squared once expanded — the corner
              // radius travels with the rest of the geometry.
              borderRadius: between(radius.md, radius.sm),
            }}
          />
        </Pressable>
      </Animated.View>
    </RNModal>
  );
}
