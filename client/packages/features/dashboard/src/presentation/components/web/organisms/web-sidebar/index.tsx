import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';
import { fontSizeScale, Icon, space, zIndex } from '@features/ui';
import {
  generic,
  primary,
  surface,
  textTokens,
} from '@features/ui/utils/colors';

import { useDashboard } from '@features/dashboard/presentation/providers/dashboard-provider';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { ColorScheme } from '@features/ui/utils/constants';

const SIDEBAR_WIDTH = 260;
const ANIMATION_DURATION = 250;

interface WebSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function WebSidebar({ open, onClose }: WebSidebarProps) {
  const { t } = useTranslation('dashboard');
  const { signOut } = useDashboard();
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const animate = useCallback(
    (toOpen: boolean) => {
      Animated.timing(translateX, {
        toValue: toOpen ? 0 : -SIDEBAR_WIDTH,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
      Animated.timing(overlayOpacity, {
        toValue: toOpen ? 0.4 : 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    },
    [translateX, overlayOpacity],
  );

  useEffect(() => {
    animate(open);
  }, [open, animate]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  const iconColor = isDark ? textTokens.dark.muted : textTokens.light.secondary;

  const backgroundColor = isDark ? surface.dark.background : surface.light.card;

  return (
    <>
      {/* Overlay */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={{
          position: 'absolute' as const,
          inset: space.zero,
          backgroundColor: generic.black,
          opacity: overlayOpacity,
          zIndex: zIndex.low,
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          accessibilityLabel={t('sidebar.closeMenu')}
        />
      </Animated.View>

      {/* Sidebar panel */}
      <Animated.View
        style={{
          position: 'absolute' as const,
          top: space.zero,
          left: space.zero,
          bottom: space.zero,
          width: SIDEBAR_WIDTH,
          transform: [{ translateX }],
          backgroundColor,
          zIndex: zIndex.medium,
        }}
        className="bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800"
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800"
          style={{ height: space.s56 }}
        >
          <Text className="text-slate-900 dark:text-white font-bold text-base">
            {t('sidebar.appName')}
          </Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 items-center justify-center rounded-lg"
            accessibilityRole="button"
            accessibilityLabel={t('sidebar.closeMenu')}
          >
            <Icon name="close" size={fontSizeScale['2xl']} color={iconColor} />
          </Pressable>
        </View>

        {/* Nav items (future) */}
        <View style={{ flex: 1 }} />

        {/* Footer: sign out */}
        <View className="border-t border-slate-100 dark:border-slate-800 p-3">
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl"
            accessibilityRole="button"
            accessibilityLabel={t('sidebar.signOut')}
          >
            <Icon name="logout" size={fontSizeScale.xl} color={primary[400]} />
            <Text className="text-primary-400 font-medium text-sm">
              {t('sidebar.signOut')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}
