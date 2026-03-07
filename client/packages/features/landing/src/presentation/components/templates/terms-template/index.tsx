import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { LegalPageHeader, LegalSection } from '@features/ui';

interface TermsTemplateProps {
  onBackPress?: () => void;
}

const SECTIONS = [
  {
    key: 'intro',
    paragraphs: [
      'Welcome to Financial Management. By accessing or using our application, you agree to be bound by these Terms of Service.',
      'Please read these terms carefully before using the app. If you do not agree, please do not use our services.',
    ],
  },
  {
    key: 'acceptance',
    paragraphs: [
      'By creating an account or using our services, you confirm that you are at least 18 years old and have the legal capacity to enter into this agreement.',
      'You agree to use the app in compliance with these terms and all applicable laws and regulations.',
    ],
  },
  {
    key: 'serviceDescription',
    paragraphs: [
      'Financial Management is a personal finance application that helps you track expenses, manage budgets, and analyze your financial activity.',
      'We reserve the right to modify, suspend, or discontinue features of the service at any time with reasonable notice.',
    ],
  },
  {
    key: 'useOfServices',
    paragraphs: [
      'You agree not to misuse our services, including but not limited to: unauthorized access, data scraping, or using the app for any illegal purpose.',
      'You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.',
    ],
  },
  {
    key: 'userContent',
    paragraphs: [
      'Any financial data or content you input into the app remains your property.',
      'You grant us a limited license to process this data solely for the purpose of providing the service to you.',
    ],
  },
  {
    key: 'thirdPartyServices',
    paragraphs: [
      'We use Google Sign-In and Facebook Login for authentication. Your use of these features is also subject to the respective terms of those providers.',
      'Google Terms of Service: policies.google.com/terms',
      'Facebook Terms of Service: facebook.com/terms',
      'We are not responsible for the availability or practices of third-party services.',
    ],
  },
  {
    key: 'liabilityLimitation',
    paragraphs: [
      'The app is provided "as is" without warranties of any kind, express or implied.',
      'We are not liable for any financial decisions made based on information provided by the app.',
      'Our liability is limited to the maximum extent permitted by applicable law.',
    ],
  },
  {
    key: 'modifications',
    paragraphs: [
      'We reserve the right to update these Terms of Service at any time.',
      'Continued use of the app after changes are published constitutes your acceptance of the updated terms.',
    ],
  },
  {
    key: 'termination',
    paragraphs: [
      'We reserve the right to suspend or terminate your account if you violate these terms.',
      'You may delete your account at any time through the app settings.',
    ],
  },
  {
    key: 'applicableLaw',
    paragraphs: [
      'These terms are governed by applicable law. Any disputes will be resolved through the appropriate legal channels in the relevant jurisdiction.',
    ],
  },
  {
    key: 'contactInfo',
    paragraphs: [
      'For questions about these Terms of Service, please contact us at contact@financialmanagement.app.',
    ],
  },
] as const;

export function TermsTemplate({ onBackPress }: TermsTemplateProps) {
  const { t } = useTranslation('landing');

  return (
    <View className="flex-1 bg-slate-900">
      <LegalPageHeader
        title={t('terms.title')}
        backLabel={t('terms.back')}
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
      >
        <Text className="text-slate-500 text-sm mb-8">
          {t('terms.lastUpdated')}
        </Text>
        {SECTIONS.map(({ key, paragraphs }) => (
          <LegalSection
            key={key}
            title={t(`terms.sections.${key}` as never)}
            paragraphs={paragraphs as unknown as string[]}
          />
        ))}
      </ScrollView>
    </View>
  );
}
