import React from 'react';
import { TouchableOpacity } from 'react-native';
import type { TouchableOpacityProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { generic, primary } from '@features/ui/utils/colors';
import { iconSize, space, zIndex } from '@features/ui/utils/spacing';

interface FloatingActionButtonProps extends Omit<
  TouchableOpacityProps,
  'style'
> {
  onPress: () => void;
  icon: string;
  size?: number;
}

export function FloatingActionButton({
  onPress,
  icon,
  size = iconSize.lg,
  ...props
}: FloatingActionButtonProps) {
  const buttonSize = size + space.lg;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={{
        position: 'absolute',
        bottom: space.lg,
        right: space.lg,
        zIndex: zIndex.big,
        width: buttonSize,
        height: buttonSize,
        borderRadius: buttonSize / 2,
        backgroundColor: primary[600],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: generic.black,
        shadowOffset: { width: space.zero, height: space.s4 },
        shadowOpacity: 0.3,
        shadowRadius: space.xs,
        elevation: space.xs,
      }}
      {...props}
    >
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size}
        color={generic.white}
      />
    </TouchableOpacity>
  );
}
