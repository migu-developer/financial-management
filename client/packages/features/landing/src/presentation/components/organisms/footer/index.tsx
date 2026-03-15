import React from 'react';
import { Image } from 'react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';
import { iconSize, maxWidth, radius } from '@features/ui';

type LinkKey = 'privacy' | 'terms' | 'contact';

const LINK_KEYS: LinkKey[] = ['privacy', 'terms', 'contact'];

interface LandingFooterProps {
  logoUrl: string;
  onPrivacyPress?: () => void;
  onTermsPress?: () => void;
  onContactPress?: () => void;
}

export function LandingFooter({
  logoUrl,
  onPrivacyPress,
  onTermsPress,
  onContactPress,
}: LandingFooterProps) {
  const { t } = useTranslation('landing');
  const currentYear = new Date().getFullYear();

  const onPressMap: Record<LinkKey, (() => void) | undefined> = {
    privacy: onPrivacyPress,
    terms: onTermsPress,
    contact: onContactPress,
  };

  return (
    <View
      className="w-full bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-10"
      accessibilityRole="none"
    >
      <View
        style={{ maxWidth: maxWidth.lg, alignSelf: 'center', width: '100%' }}
      >
        {/* Top row: logo + links */}
        <View className="flex-row items-center justify-center md:justify-between flex-wrap gap-4 mb-6">
          {/* Logo */}
          <View className="flex-row items-center gap-2">
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
            <Text className="text-slate-900 dark:text-white font-bold text-base">
              {t('footer.logo')}
            </Text>
          </View>

          {/* Links */}
          <View className="flex-row gap-6">
            {LINK_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                accessibilityRole="link"
                accessibilityLabel={t(`footer.links.${key}.a11y`)}
                onPress={onPressMap[key]}
              >
                <Text className="text-slate-500 dark:text-slate-400 text-sm">
                  {t(`footer.links.${key}.label`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View className="border-t border-slate-200 dark:border-slate-800 mb-6" />

        {/* Bottom row: copyright + tagline */}
        <View className="flex-row items-center justify-between flex-wrap gap-2">
          <Text className="text-slate-600 dark:text-slate-500 text-sm">
            {t('footer.copyright', { year: currentYear })}
          </Text>
          <Text className="text-slate-500 dark:text-slate-600 text-xs">
            {t('footer.tagline')}
          </Text>
        </View>
      </View>
    </View>
  );
}
