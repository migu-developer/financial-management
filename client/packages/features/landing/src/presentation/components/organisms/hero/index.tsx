import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { Button } from '@features/ui';

interface HeroSectionProps {
  onGetStartedPress?: () => void;
  onFeaturesPress?: () => void;
}

export function HeroSection({
  onGetStartedPress,
  onFeaturesPress,
}: HeroSectionProps) {
  const { t } = useTranslation('landing');

  return (
    <View
      className="w-full bg-slate-900 px-6 py-20"
      accessibilityRole="none"
      accessible={false}
    >
      <View style={{ maxWidth: 720, alignSelf: 'center', width: '100%' }}>
        {/* Badge */}
        <View className="self-start flex-row items-center gap-2 border border-accent-500/40 bg-accent-500/10 rounded-full px-4 py-1.5 mb-8">
          <View
            className="w-2 h-2 rounded-full bg-accent-500"
            accessible={false}
          />
          <Text className="text-accent-400 text-sm font-medium">
            {t('hero.badge')}
          </Text>
        </View>

        {/* Headline */}
        <Text
          className="text-white font-extrabold text-4xl web:text-6xl leading-tight mb-6"
          accessibilityRole="header"
          aria-level={1}
        >
          {t('hero.headline')}
          {'\n'}
          <Text className="text-accent-400">{t('hero.headlineAccent')}</Text>
        </Text>

        {/* Subtitle */}
        <Text className="text-slate-400 text-lg web:text-xl leading-relaxed mb-10">
          {t('hero.subtitle')}
        </Text>

        {/* CTA buttons */}
        <View className="flex-row gap-4 flex-wrap mb-16">
          <Button
            label={t('hero.cta.getStarted')}
            size="lg"
            variant="primary"
            onPress={onGetStartedPress}
            accessibilityLabel={t('hero.a11y.getStarted')}
          />
          <Button
            label={t('hero.cta.features')}
            size="lg"
            variant="outline"
            className="border-slate-600"
            onPress={onFeaturesPress}
            accessibilityLabel={t('hero.a11y.features')}
          />
        </View>

        {/* Social proof stats */}
        <View className="flex-row gap-8 flex-wrap border-t border-slate-800 pt-8">
          <View>
            <Text className="text-white font-bold text-2xl">
              {t('hero.stats.rating.value')}
            </Text>
            <Text className="text-slate-500 text-sm">
              {t('hero.stats.rating.label')}
            </Text>
          </View>
          <View>
            <Text className="text-white font-bold text-2xl">
              {t('hero.stats.uptime.value')}
            </Text>
            <Text className="text-slate-500 text-sm">
              {t('hero.stats.uptime.label')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
