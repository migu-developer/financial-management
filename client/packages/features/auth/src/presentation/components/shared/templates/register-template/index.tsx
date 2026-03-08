import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { Icon } from '@features/ui';
import { primary } from '@features/ui/utils/colors';

interface RegisterTemplateProps {
  onBack: () => void;
}

export function RegisterTemplate({ onBack }: RegisterTemplateProps) {
  const { t } = useTranslation('login');

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center px-8">
      <Icon
        name="construction"
        size={64}
        color={primary[400]}
        containerClassName="mb-6"
      />
      <Text className="text-slate-900 dark:text-white font-bold text-2xl mb-3 text-center">
        {t('register.title')}
      </Text>
      <Text className="text-primary-400 font-semibold text-lg mb-4 text-center">
        {t('register.comingSoon')}
      </Text>
      <Text className="text-slate-500 dark:text-slate-400 text-base text-center mb-8">
        {t('register.description')}
      </Text>
      <TouchableOpacity
        onPress={onBack}
        className="border border-primary-600 rounded-xl px-6 py-3"
        accessibilityRole="button"
        accessibilityLabel={t('register.back')}
      >
        <Text className="text-primary-400 font-semibold">
          {t('register.back')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
