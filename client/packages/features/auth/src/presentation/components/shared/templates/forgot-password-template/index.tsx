import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import {
  Button,
  Card,
  FormInput,
  LanguageSelector,
  maxWidth,
  space,
  ThemeToggle,
} from '@features/ui';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ForgotPasswordTemplateProps {
  onSubmit: (identifier: string) => void;
  onBack: () => void;
  loading?: boolean;
  error?: string;
}

export function ForgotPasswordTemplate({
  onSubmit,
  onBack,
  loading = false,
  error,
}: ForgotPasswordTemplateProps) {
  const { t } = useTranslation('login');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();

  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      if (value.length > 0) {
        const valid = EMAIL_REGEX.test(value.trim());
        setEmailError(valid ? undefined : t('identifierInput.invalidEmail'));
      } else {
        setEmailError(undefined);
      }
    },
    [t],
  );

  const isFormValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);

  const handleSubmit = useCallback(() => {
    onSubmit(email.trim());
  }, [email, onSubmit]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-900"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: space.lg,
      }}
    >
      {/* Language / Theme bar */}
      <View
        className="w-full flex-row justify-end gap-2 mb-4"
        style={{ maxWidth: maxWidth.form }}
      >
        <LanguageSelector />
        <ThemeToggle />
      </View>

      <Card className="w-full p-6" style={{ maxWidth: maxWidth.form }}>
        <View className="mb-8">
          <Text className="text-slate-900 dark:text-white font-bold text-3xl mb-2">
            {t('forgotPasswordPage.title')}
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-base">
            {t('forgotPasswordPage.subtitle')}
          </Text>
        </View>

        {error ? (
          <View className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        ) : null}

        <FormInput
          label={t('identifierInput.label')}
          value={email}
          onChangeText={handleEmailChange}
          placeholder={t('identifierInput.placeholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={emailError}
          disabled={loading}
        />

        <Button
          label={t('forgotPasswordPage.submitButton')}
          onPress={handleSubmit}
          loading={loading}
          disabled={!isFormValid}
          className="mb-6 mt-2"
        />

        <TouchableOpacity
          onPress={onBack}
          className="items-center"
          accessibilityRole="button"
        >
          <Text className="text-primary-400 text-sm">
            {t('forgotPasswordPage.back')}
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}
