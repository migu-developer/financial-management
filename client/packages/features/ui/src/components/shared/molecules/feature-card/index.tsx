import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { Icon } from '@features/ui/components/shared/atoms/icon';
import { Text } from '@features/ui/components/shared/atoms/text';
import { primary } from '@features/ui/utils/colors';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface FeatureCardProps {
  icon: MaterialIconName;
  iconColor?: string;
  iconBgClassName?: string;
  title: string;
  description: string;
  className?: string;
  style?: ViewStyle;
}

export function FeatureCard({
  icon,
  iconColor = primary[600],
  iconBgClassName = 'bg-primary-50',
  title,
  description,
  className = '',
  style,
}: FeatureCardProps) {
  return (
    <View
      className={`bg-white rounded-2xl p-6 shadow-sm ${className}`}
      style={style}
      accessible
      accessibilityRole="none"
    >
      <Icon
        name={icon}
        size={28}
        color={iconColor}
        containerClassName={`w-14 h-14 rounded-xl items-center justify-center mb-4 ${iconBgClassName}`}
      />
      <Text variant="h4" className="text-slate-900 mb-2">
        {title}
      </Text>
      <Text variant="body-sm" className="text-slate-500">
        {description}
      </Text>
    </View>
  );
}
