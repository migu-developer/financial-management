import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import type { DashboardUser } from '@features/dashboard/domain/entities/dashboard-user';
import { space, zIndex } from '@features/ui';

interface UserMenuProps {
  user: DashboardUser | null;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

export function UserMenu({ user, onSignOut, onClose }: UserMenuProps) {
  const { t } = useTranslation('dashboard');

  const handleSignOut = async () => {
    onClose();
    await onSignOut();
  };

  return (
    <>
      {/* Dismiss overlay */}
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute' as const,
          top: space.zero,
          left: space.zero,
          right: space.zero,
          bottom: space.zero,
          zIndex: zIndex.low,
        }}
        accessibilityLabel={t('userMenu.closeMenu')}
      />

      {/* Dropdown panel */}
      <View
        className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-lg"
        style={{ top: '100%', zIndex: zIndex.low + 1 }}
        accessibilityViewIsModal
      >
        {user && (
          <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <Text
              className="text-slate-900 dark:text-white font-semibold text-sm"
              numberOfLines={1}
            >
              {user.fullname}
            </Text>
            <Text
              className="text-slate-500 dark:text-slate-400 text-xs mt-0.5"
              numberOfLines={1}
            >
              {user.email}
            </Text>
          </View>
        )}

        <View className="py-1">
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center gap-2 px-4 py-2.5"
            accessibilityRole="button"
            accessibilityLabel={t('userMenu.signOut')}
          >
            <Text className="text-red-500 text-sm font-medium">
              {t('userMenu.signOut')}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}
