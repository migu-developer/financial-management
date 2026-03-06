import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { Button, LanguageSelector, ThemeToggle } from '@features/ui';

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
    <View className="w-full bg-slate-900 px-6 py-4 flex-row items-center justify-between">
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
            style={{ width: 36, height: 36, borderRadius: 8 }}
            accessibilityElementsHidden
          />
        )}
        <Text className="text-white font-bold text-lg tracking-tight">
          {t('header.logo')}
        </Text>
      </View>

      {/* Nav links — visible only on web */}
      <View
        className="hidden web:flex flex-row gap-8"
        accessibilityRole="none"
        aria-label={t('header.a11y.nav')}
      >
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel={t('header.a11y.navFeatures')}
          onPress={onFeaturesPress}
        >
          <Text className="text-slate-300 text-sm font-medium">
            {t('header.nav.features')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel={t('header.a11y.navHowItWorks')}
          onPress={onHowItWorksPress}
        >
          <Text className="text-slate-300 text-sm font-medium">
            {t('header.nav.howItWorks')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* CTA + language selector + theme toggle */}
      <View className="flex-row items-center gap-3">
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
  );
}
