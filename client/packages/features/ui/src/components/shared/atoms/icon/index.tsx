import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { neutral } from '@features/ui/utils/colors';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface IconProps {
  name: MaterialIconName;
  size?: number;
  color?: string;
  containerClassName?: string;
}

export function Icon({
  name,
  size = 24,
  color = neutral[900],
  containerClassName,
}: IconProps) {
  if (containerClassName) {
    return (
      <View
        className={containerClassName}
        accessible={false}
        importantForAccessibility="no"
      >
        <MaterialIcons name={name} size={size} color={color} />
      </View>
    );
  }
  return <MaterialIcons name={name} size={size} color={color} />;
}
