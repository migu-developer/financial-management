import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import {
  Button,
  iconSize,
  LanguageSelector,
  radius,
  ThemeToggle,
} from '@features/ui';

interface LandingHeaderProps {
  onLoginPress?: () => void;
  onFeaturesPress?: () => void;
  onHowItWorksPress?: () => void;
  logoUrl: string;
}

export function LandingHeader({
  onLoginPress,
  onFeaturesPress,
  onHowItWorksPress,
  logoUrl,
}: LandingHeaderProps) {
  const { t } = useTranslation('landing');

  return (
    <View className="w-full bg-slate-50 dark:bg-slate-900 px-4 md:px-6 py-4">
      {/* Main row: logo + nav (md+) + controls */}
      <View className="flex-row items-center justify-between">
        {/* Logo */}
        <View
          className="flex-row items-center gap-2"
          accessible
          accessibilityRole="none"
          accessibilityLabel={t('header.logo')}
        >
          {logoUrl && (
            <Image
              source={{ uri: logoUrl }}
              style={{
                width: iconSize['2xl'],
                height: iconSize['2xl'],
                borderRadius: radius.md,
              }}
              accessibilityElementsHidden
            />
          )}
          {/* App name: hidden on small screens to prevent overflow */}
          <View className="hidden sm:flex">
            <Text className="text-slate-900 dark:text-white font-bold text-lg tracking-tight">
              {t('header.logo')}
            </Text>
          </View>
        </View>

        {/* Nav links — md and above */}
        <View
          className="hidden md:flex flex-row gap-8"
          accessibilityRole="none"
          aria-label={t('header.a11y.nav')}
        >
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel={t('header.a11y.navFeatures')}
            onPress={onFeaturesPress}
          >
            <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              {t('header.nav.features')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel={t('header.a11y.navHowItWorks')}
            onPress={onHowItWorksPress}
          >
            <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              {t('header.nav.howItWorks')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right controls — always visible */}
        <View className="flex-row items-center gap-2 md:gap-3">
          <LanguageSelector />
          <ThemeToggle />
          <Button
            label={t('header.cta')}
            size="sm"
            variant="primary"
            onPress={onLoginPress}
            accessibilityLabel={t('header.a11y.cta')}
          />
        </View>
      </View>
    </View>
  );
}
