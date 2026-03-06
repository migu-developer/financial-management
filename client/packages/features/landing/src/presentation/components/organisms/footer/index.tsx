import React from 'react';
import { Image } from 'react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

type LinkKey = 'privacy' | 'terms' | 'contact';

const LINK_KEYS: LinkKey[] = ['privacy', 'terms', 'contact'];

interface LandingFooterProps {
  logoUrl: string;
}

export function LandingFooter({ logoUrl }: LandingFooterProps) {
  const { t } = useTranslation('landing');
  const currentYear = new Date().getFullYear();

  return (
    <View
      className="w-full bg-slate-900 border-t border-slate-800 px-6 py-10"
      accessibilityRole="none"
    >
      <View style={{ maxWidth: 1100, alignSelf: 'center', width: '100%' }}>
        {/* Top row: logo + links */}
        <View className="flex-row items-center justify-between flex-wrap gap-4 mb-6">
          {/* Logo */}
          <View className="flex-row items-center gap-2">
            {logoUrl && (
              <Image
                source={{ uri: logoUrl }}
                style={{ width: 36, height: 36, borderRadius: 8 }}
                accessibilityElementsHidden
              />
            )}
            <Text className="text-white font-bold text-base">
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
              >
                <Text className="text-slate-400 text-sm">
                  {t(`footer.links.${key}.label`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View className="border-t border-slate-800 mb-6" />

        {/* Bottom row: copyright + tagline */}
        <View className="flex-row items-center justify-between flex-wrap gap-2">
          <Text className="text-slate-500 text-sm">
            {t('footer.copyright', { year: currentYear })}
          </Text>
          <Text className="text-slate-600 text-xs">{t('footer.tagline')}</Text>
        </View>
      </View>
    </View>
  );
}
