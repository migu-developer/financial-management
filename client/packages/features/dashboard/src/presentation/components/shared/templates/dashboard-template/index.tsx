import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';
import { Icon } from '@features/ui';
import { primary } from '@features/ui/utils/colors';

export function DashboardTemplate() {
  const { t } = useTranslation('dashboard');

  return (
    <View className="flex-1 bg-slate-900 items-center justify-center px-8">
      <Icon
        name="dashboard"
        size={72}
        color={primary[400]}
        containerClassName="mb-6"
      />
      <Text className="text-white font-bold text-3xl mb-3 text-center">
        {t('home.title')}
      </Text>
      <Text className="text-primary-400 font-semibold text-lg mb-4 text-center">
        {t('home.underDevelopment')}
      </Text>
      <Text className="text-slate-400 text-base text-center leading-7">
        {t('home.description')}
      </Text>
    </View>
  );
}
