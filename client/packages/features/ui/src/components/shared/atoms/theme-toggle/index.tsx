import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';

import { useTranslation } from '@packages/i18n';

import { ColorScheme, IconNames } from '@features/ui/utils/constants';
import { uiTokens } from '@features/ui/utils/colors';
import { useThemeActions } from '@features/ui/contexts/theme-context';

export function ThemeToggle() {
  const { colorScheme } = useColorScheme();
  const { toggleColorScheme } = useThemeActions();
  const { t } = useTranslation('ui');
  const isDark = colorScheme === ColorScheme.DARK;

  return (
    <Pressable
      onPress={toggleColorScheme}
      className="w-9 h-9 rounded-xl items-center justify-center bg-slate-200/60 dark:bg-slate-700/60"
      accessibilityRole="button"
      accessibilityLabel={
        isDark ? t('themeToggle.switchToLight') : t('themeToggle.switchToDark')
      }
    >
      <MaterialIcons
        name={isDark ? IconNames.LIGHT : IconNames.DARK}
        size={20}
        color={isDark ? uiTokens.sunColor : uiTokens.moonColor}
      />
    </Pressable>
  );
}
