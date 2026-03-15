import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import {
  primary,
  accent,
  success,
  warning,
  maxWidth,
  width,
} from '@features/ui';

import { FeatureCard } from '@features/landing/presentation/components/molecules/feature-card';

type FeatureKey = 'expenses' | 'analytics' | 'multiCurrency' | 'security';

const FEATURE_CONFIGS: Array<{
  key: FeatureKey;
  icon:
    | 'account-balance-wallet'
    | 'bar-chart'
    | 'currency-exchange'
    | 'verified-user';
  iconColor: string;
  iconBgClassName: string;
}> = [
  {
    key: 'expenses',
    icon: 'account-balance-wallet',
    iconColor: primary[600],
    iconBgClassName: 'bg-primary-50',
  },
  {
    key: 'analytics',
    icon: 'bar-chart',
    iconColor: success.DEFAULT,
    iconBgClassName: 'bg-emerald-50',
  },
  {
    key: 'multiCurrency',
    icon: 'currency-exchange',
    iconColor: warning.DEFAULT,
    iconBgClassName: 'bg-amber-50',
  },
  {
    key: 'security',
    icon: 'verified-user',
    iconColor: accent[600],
    iconBgClassName: 'bg-violet-50',
  },
];

export function FeaturesSection() {
  const { t } = useTranslation('landing');

  return (
    <View
      className="w-full bg-white dark:bg-slate-900 px-6 py-20"
      accessible={false}
    >
      <View
        style={{ maxWidth: maxWidth.lg, alignSelf: 'center', width: '100%' }}
      >
        {/* Section label */}
        <Text className="text-primary-600 font-semibold text-sm tracking-widest uppercase mb-3 text-center">
          {t('features.sectionLabel')}
        </Text>

        {/* Section title */}
        <Text
          className="text-slate-900 dark:text-white font-bold text-3xl web:text-4xl text-center mb-4"
          accessibilityRole="header"
          aria-level={2}
        >
          {t('features.title')}
        </Text>

        {/* Section subtitle */}
        <Text
          className="text-slate-500 dark:text-slate-400 text-lg text-center mb-14"
          style={{ maxWidth: maxWidth.sm, alignSelf: 'center' }}
        >
          {t('features.subtitle')}
        </Text>

        {/* Cards grid */}
        <View className="flex-row flex-wrap gap-6">
          {FEATURE_CONFIGS.map((feature) => (
            <FeatureCard
              key={feature.key}
              icon={feature.icon}
              iconColor={feature.iconColor}
              iconBgClassName={feature.iconBgClassName}
              title={t(`features.items.${feature.key}.title`)}
              description={t(`features.items.${feature.key}.description`)}
              className="flex-1 web:min-w-64"
              style={{ minWidth: width.xxs.small }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
