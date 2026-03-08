import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { LegalPageHeader } from '@features/landing/presentation/components/molecules/legal-page-header';
import { LegalSection } from '@features/landing/presentation/components/molecules/legal-section';

interface PrivacyTemplateProps {
  onBackPress?: () => void;
}

const SECTIONS = [
  {
    key: 'intro',
    paragraphs: [
      'This Privacy Policy describes how Financial Management ("we", "us", or "our") collects, uses, and protects your personal information when you use our mobile application.',
      'We are committed to protecting your privacy in accordance with applicable data protection laws including GDPR and CCPA.',
    ],
  },
  {
    key: 'dataCollection',
    paragraphs: [
      'When you sign in using Google or Facebook, we receive your name, email address, and profile picture from those providers.',
      'We may also collect usage data (app interactions and feature usage), device information (OS version and device type), and any financial data you voluntarily enter into the app.',
      'We do not access your Google or Facebook account beyond the minimum information required for authentication.',
    ],
  },
  {
    key: 'dataUse',
    paragraphs: [
      'To provide, maintain, and improve our financial management services.',
      'To authenticate your identity via Google Sign-In or Facebook Login.',
      'To communicate with you about account activity, updates, and support.',
      'To analyze aggregate usage patterns and enhance the overall app experience.',
    ],
  },
  {
    key: 'dataSharing',
    paragraphs: [
      'We do not sell your personal information to third parties.',
      'We may share data with trusted service providers who assist in operating the app, under strict confidentiality agreements.',
      'We may disclose information when required by law or to protect the rights and safety of our users.',
    ],
  },
  {
    key: 'dataSecurity',
    paragraphs: [
      'We implement industry-standard security measures, including encryption in transit and at rest.',
      'Authentication is handled securely through OAuth 2.0 with Google and Facebook.',
      'We regularly review our security practices to ensure your data remains protected.',
    ],
  },
  {
    key: 'thirdPartyAuth',
    paragraphs: [
      'We use Google Sign-In and Facebook Login for authentication. By using these sign-in methods, you also agree to their respective privacy policies.',
      'Google Privacy Policy: policies.google.com/privacy',
      'Facebook Data Policy: facebook.com/privacy/policy',
      'We request only the minimum permissions needed: your name, email address, and profile picture.',
    ],
  },
  {
    key: 'userRights',
    paragraphs: [
      'You have the right to access, correct, or delete your personal data at any time.',
      'You may revoke third-party authentication at any time through your Google or Facebook account settings.',
      'To exercise your rights, contact us at the email provided in the Contact section.',
    ],
  },
  {
    key: 'policyChanges',
    paragraphs: [
      'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification.',
      'Continued use of the app after changes are published constitutes your acceptance of the updated policy.',
    ],
  },
  {
    key: 'contactInfo',
    paragraphs: [
      'If you have questions about this Privacy Policy, please contact us at gutierrezmayamiguelangel@gmail.com.',
    ],
  },
] as const;

export function PrivacyTemplate({ onBackPress }: PrivacyTemplateProps) {
  const { t } = useTranslation('landing');

  return (
    <View className="flex-1 bg-slate-900">
      <LegalPageHeader
        title={t('privacy.title')}
        backLabel={t('privacy.back')}
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
      >
        <Text className="text-slate-500 text-sm mb-8">
          {t('privacy.lastUpdated')}
        </Text>
        {SECTIONS.map(({ key, paragraphs }) => (
          <LegalSection
            key={key}
            title={t(`privacy.sections.${key}` as `privacy.sections.${typeof key}`)}
            paragraphs={paragraphs}
          />
        ))}
      </ScrollView>
    </View>
  );
}
