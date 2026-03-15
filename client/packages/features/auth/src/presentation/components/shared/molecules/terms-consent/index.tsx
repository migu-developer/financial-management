import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { openURL } from 'expo-linking';

import { useTranslation } from '@packages/i18n';
import { generic, primary } from '@features/ui/utils/colors';
import { SelectableOption } from '@features/ui';

export interface TermsConsentProps {
  accepted: boolean;
  onChange: (value: boolean) => void;
  onPressTerms?: () => void;
  onPressPrivacy?: () => void;
  termsUrl?: string;
  privacyUrl?: string;
  error?: string;
}

export function TermsConsent({
  accepted,
  onChange,
  onPressTerms,
  onPressPrivacy,
  termsUrl,
  privacyUrl,
  error,
}: TermsConsentProps) {
  const { t } = useTranslation('login');

  const handlePressTerms = useCallback(() => {
    if (onPressTerms) {
      onPressTerms();
    } else if (termsUrl) {
      void openURL(termsUrl);
    }
  }, [onPressTerms, termsUrl]);

  const handlePressPrivacy = useCallback(() => {
    if (onPressPrivacy) {
      onPressPrivacy();
    } else if (privacyUrl) {
      void openURL(privacyUrl);
    }
  }, [onPressPrivacy, privacyUrl]);

  return (
    <View className="mb-4">
      <SelectableOption
        selected={accepted}
        selectedIcon="checkbox-marked"
        unselectedIcon="checkbox-blank-outline"
        iconSize={20}
        selectedIconColor={primary[500]}
        onPress={() => onChange(!accepted)}
        className="flex-row items-start gap-2"
        accessibilityRole="checkbox"
        accessibilityLabel={t('register.termsConsent')}
        testID="terms-consent-checkbox"
      >
        <View className="flex-row flex-wrap flex-1">
          <Text className="text-slate-600 dark:text-slate-300 text-sm">
            {t('register.termsConsent')}{' '}
          </Text>
          <TouchableOpacity
            onPress={handlePressTerms}
            accessibilityRole="link"
            accessibilityLabel={t('register.termsLink')}
          >
            <Text className="text-primary-400 text-sm font-medium">
              {t('register.termsLink')}
            </Text>
          </TouchableOpacity>
          <Text className="text-slate-600 dark:text-slate-300 text-sm">
            {' '}
            {t('register.andText')}{' '}
          </Text>
          <TouchableOpacity
            onPress={handlePressPrivacy}
            accessibilityRole="link"
            accessibilityLabel={t('register.privacyLink')}
          >
            <Text className="text-primary-400 text-sm font-medium">
              {t('register.privacyLink')}
            </Text>
          </TouchableOpacity>
        </View>
      </SelectableOption>

      {error ? (
        <Text
          className="text-red-400 text-xs mt-1"
          style={{ color: generic.error }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
