import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PressableProps } from 'react-native';

import { primary } from '@features/ui/utils/colors';
import { useTranslation } from '@packages/i18n';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps extends Omit<PressableProps, 'style'> {
  initials: string;
  size?: AvatarSize;
  accessibilityLabel?: string;
}

const containerSizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const textSizeClasses: Record<AvatarSize, string> = {
  sm: 'text-xs font-bold',
  md: 'text-sm font-bold',
  lg: 'text-base font-bold',
};

export function Avatar({
  initials,
  size = 'md',
  onPress,
  accessibilityLabel,
  disabled,
  ...rest
}: AvatarProps) {
  const content = (
    <View
      className={`${containerSizeClasses[size]} rounded-full items-center justify-center`}
      style={{ backgroundColor: primary[600] }}
    >
      <Text className={`text-white ${textSizeClasses[size]}`}>
        {initials.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  const { t } = useTranslation('dashboard');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? t('avatar.accessibilityLabel', { initials })
      }
      {...rest}
    >
      {content}
    </Pressable>
  );
}
