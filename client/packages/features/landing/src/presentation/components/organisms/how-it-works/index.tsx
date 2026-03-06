import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { primary, accent } from '@features/ui/utils/colors';

type StepKey = 'create' | 'connect' | 'analyze';

const STEP_CONFIGS: Array<{
  key: StepKey;
  icon: 'person-add' | 'account-balance' | 'insights';
  iconColor: string;
}> = [
  { key: 'create', icon: 'person-add', iconColor: primary[600] },
  { key: 'analyze', icon: 'insights', iconColor: accent[600] },
];

export function HowItWorksSection() {
  const { t } = useTranslation('landing');

  return (
    <View className="w-full bg-slate-50 px-6 py-20" accessible={false}>
      <View style={{ maxWidth: 1100, alignSelf: 'center', width: '100%' }}>
        {/* Section label */}
        <Text className="text-primary-600 font-semibold text-sm tracking-widest uppercase mb-3 text-center">
          {t('howItWorks.sectionLabel')}
        </Text>

        {/* Section title */}
        <Text
          className="text-slate-900 font-bold text-3xl web:text-4xl text-center mb-4"
          accessibilityRole="header"
          aria-level={2}
        >
          {t('howItWorks.title')}
        </Text>

        <Text
          className="text-slate-500 text-lg text-center mb-14"
          style={{ maxWidth: 480, alignSelf: 'center' }}
        >
          {t('howItWorks.subtitle')}
        </Text>

        {/* Steps */}
        <View className="flex-row flex-wrap gap-8 justify-center">
          {STEP_CONFIGS.map((step, index) => {
            const title = t(`howItWorks.steps.${step.key}.title`);
            const description = t(`howItWorks.steps.${step.key}.description`);

            return (
              <View
                key={step.key}
                className="items-center flex-1"
                style={{ minWidth: 220, maxWidth: 300 }}
                accessible
                accessibilityRole="none"
                accessibilityLabel={t('howItWorks.a11y.step', {
                  number: index + 1,
                  title,
                  description,
                })}
              >
                {/* Step number + icon */}
                <View className="relative mb-5">
                  <View className="w-20 h-20 rounded-2xl bg-white shadow-sm items-center justify-center">
                    <MaterialIcons
                      name={step.icon}
                      size={36}
                      color={step.iconColor}
                    />
                  </View>
                  <View
                    className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-slate-900 items-center justify-center"
                    accessible={false}
                  >
                    <Text className="text-white text-xs font-bold">
                      {index + 1}
                    </Text>
                  </View>
                </View>

                {/* Step title */}
                <Text className="text-slate-900 font-semibold text-lg text-center mb-2">
                  {title}
                </Text>

                {/* Step description */}
                <Text className="text-slate-500 text-sm text-center leading-relaxed">
                  {description}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
