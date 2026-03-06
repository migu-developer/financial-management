import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { Button } from '@features/ui';

interface CTASectionProps {
  onGetStartedPress?: () => void;
}

export function CTASection({ onGetStartedPress }: CTASectionProps) {
  const { t } = useTranslation('landing');

  return (
    <View className="w-full bg-primary-600 px-6 py-20" accessible={false}>
      <View
        style={{
          maxWidth: 640,
          alignSelf: 'center',
          width: '100%',
          alignItems: 'center',
        }}
      >
        {/* Decorative top icon */}
        <View className="w-14 h-14 rounded-2xl bg-white/10 items-center justify-center mb-6">
          <Text className="text-3xl" accessibilityElementsHidden>
            💰
          </Text>
        </View>

        {/* Headline */}
        <Text
          className="text-white font-extrabold text-3xl web:text-5xl text-center mb-4 leading-tight"
          accessibilityRole="header"
          aria-level={2}
        >
          {t('cta.title')}
        </Text>

        {/* Subtitle */}
        <Text className="text-primary-200 text-lg text-center mb-10 leading-relaxed">
          {t('cta.subtitle')}
        </Text>

        {/* CTA */}
        <Button
          label={t('cta.button')}
          size="lg"
          variant="ghost"
          className="bg-white"
          onPress={onGetStartedPress}
          accessibilityLabel={t('cta.a11y.button')}
        />

        {/* Trust note */}
        <Text className="text-primary-200/70 text-sm mt-4 text-center">
          {t('cta.trustNote')}
        </Text>
      </View>
    </View>
  );
}
