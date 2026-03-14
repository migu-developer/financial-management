import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { LegalPageHeader } from '@features/landing/presentation/components/molecules/legal-page-header';
import { space } from '@features/ui';

interface ContactTemplateProps {
  onBackPress?: () => void;
}

type SectionKey = 'support' | 'privacyInquiries' | 'business';

const SECTION_KEYS: SectionKey[] = ['support', 'privacyInquiries', 'business'];

export function ContactTemplate({ onBackPress }: ContactTemplateProps) {
  const { t } = useTranslation('landing');

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <LegalPageHeader
        title={t('contact.title')}
        backLabel={t('contact.back')}
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: space['2xl'],
        }}
      >
        <Text className="text-slate-600 dark:text-slate-300 text-base mb-8">
          {t('contact.subtitle')}
        </Text>

        {/* Contact sections */}
        {SECTION_KEYS.map((key) => (
          <View key={key} className="mb-8">
            <Text className="text-slate-900 dark:text-white font-bold text-xl mb-2">
              {t(`contact.sections.${key}.title`)}
            </Text>
            <Text className="text-slate-600 dark:text-slate-300 text-base">
              {t(`contact.sections.${key}.body`)}
            </Text>
          </View>
        ))}

        {/* Email CTA */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 mt-2">
          <Text className="text-slate-500 dark:text-slate-400 text-sm mb-1">
            {t('contact.emailLabel')}
          </Text>
          <Text className="text-primary-400 font-semibold text-base mb-4">
            {t('contact.email')}
          </Text>
          <Text className="text-slate-600 dark:text-slate-500 text-sm">
            {t('contact.responseTime')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
