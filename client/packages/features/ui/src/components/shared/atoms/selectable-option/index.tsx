import React from 'react';
import type { TouchableOpacityProps } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { primary, textTokens } from '@features/ui/utils/colors';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface SelectableOptionProps extends TouchableOpacityProps {
  selected: boolean;
  /** MaterialCommunityIcons icon name when selected */
  selectedIcon: IconName;
  /** MaterialCommunityIcons icon name when unselected */
  unselectedIcon: IconName;
  iconSize?: number;
  selectedIconColor?: string;
  children: React.ReactNode;
}

export function SelectableOption({
  selected,
  selectedIcon,
  unselectedIcon,
  iconSize = 20,
  selectedIconColor,
  disabled,
  children,
  className = '',
  ...props
}: SelectableOptionProps) {
  const iconColor = selected
    ? (selectedIconColor ?? primary[500])
    : textTokens.dark.muted;

  return (
    <TouchableOpacity
      disabled={disabled}
      accessibilityState={{ checked: selected, disabled }}
      className={className}
      {...props}
    >
      <MaterialCommunityIcons
        name={selected ? selectedIcon : unselectedIcon}
        size={iconSize}
        color={iconColor}
      />
      {children}
    </TouchableOpacity>
  );
}
