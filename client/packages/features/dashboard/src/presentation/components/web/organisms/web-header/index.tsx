import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTranslation } from '@packages/i18n';
import {
  Avatar,
  fontSizeScale,
  Icon,
  LanguageSelector,
  space,
  ThemeToggle,
  zIndex,
} from '@features/ui';
import { uiTokens, textTokens } from '@features/ui/utils/colors';

import { useDashboard } from '@features/dashboard/presentation/providers/dashboard-provider';
import { computeInitials } from '@features/dashboard/domain/entities/dashboard-user';
import { UserMenu } from '@features/dashboard/presentation/components/web/molecules/user-menu';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { ColorScheme } from '@features/ui/utils/constants';

interface WebHeaderProps {
  onMenuPress: () => void;
}

export function WebHeader({ onMenuPress }: WebHeaderProps) {
  const { t } = useTranslation('dashboard');
  const { user, signOut } = useDashboard();
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user ? computeInitials(user.fullname, user.email) : '?';

  const iconColor = isDark ? uiTokens.moonColor : textTokens.light.secondary;

  return (
    <View
      className="flex-row items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800"
      style={{ height: space.s56, zIndex: zIndex.big }}
    >
      {/* Left: hamburger */}
      <Pressable
        onPress={onMenuPress}
        className="w-9 h-9 items-center justify-center rounded-lg"
        accessibilityRole="button"
        accessibilityLabel={t('header.menuLabel')}
      >
        <Icon name="menu" size={fontSizeScale.xl} color={iconColor} />
      </Pressable>

      {/* Right: theme toggle + language selector + avatar */}
      <View className="flex-row items-center gap-2">
        <ThemeToggle />
        <LanguageSelector />
        <View style={{ position: 'relative' as const }}>
          <Avatar
            initials={initials}
            size="md"
            onPress={() => setMenuOpen((v) => !v)}
            accessibilityLabel={t('header.userMenuLabel')}
          />
          {menuOpen && (
            <UserMenu
              user={user}
              onSignOut={signOut}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </View>
      </View>
    </View>
  );
}
