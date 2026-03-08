import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { primary } from '@features/ui/utils/colors';

interface NotFoundTemplateProps {
  onGoHomePress?: () => void;
}

export function NotFoundTemplate({ onGoHomePress }: NotFoundTemplateProps) {
  const { t } = useTranslation('landing');

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center px-6">
      <Text
        className="text-center font-bold"
        style={{ fontSize: 96, lineHeight: 112, color: primary[600] }}
      >
        {t('notFound.code')}
      </Text>

      <Text className="text-slate-900 dark:text-white font-bold text-2xl text-center mt-2 mb-4">
        {t('notFound.title')}
      </Text>

      <Text className="text-slate-500 dark:text-slate-400 text-base text-center mb-8">
        {t('notFound.description')}
      </Text>

      <Pressable
        onPress={onGoHomePress}
        className="bg-primary-600 px-8 py-4 rounded-2xl"
        accessibilityRole="button"
        accessibilityLabel={t('notFound.a11y.cta')}
      >
        <Text className="text-white font-bold text-base">
          {t('notFound.cta')}
        </Text>
      </Pressable>
    </View>
  );
}
