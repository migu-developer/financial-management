import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import {
  Button,
  Card,
  LanguageSelector,
  maxWidth,
  PasswordInput,
  space,
  ThemeToggle,
} from '@features/ui';

import { PasswordStrength } from '@features/auth/presentation/components/shared/atoms/password-strength';

export interface NewPasswordTemplateProps {
  onSubmit: (newPassword: string) => void;
  onBack?: () => void;
  loading?: boolean;
  error?: string;
}

export function NewPasswordTemplate({
  onSubmit,
  onBack,
  loading = false,
  error,
}: NewPasswordTemplateProps) {
  const { t } = useTranslation('login');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const canSubmit =
    newPassword !== '' &&
    confirmPassword !== '' &&
    newPassword === confirmPassword;

  const handleSubmit = useCallback(() => {
    onSubmit(newPassword);
  }, [newPassword, onSubmit]);

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
            {t('newPassword.title')}
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-base">
            {t('newPassword.subtitle')}
          </Text>
        </View>

        {error ? (
          <View className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        ) : null}

        <PasswordInput
          label={t('newPassword.newPasswordLabel')}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('newPassword.newPasswordPlaceholder')}
          disabled={loading}
        />

        <PasswordStrength password={newPassword} />

        <PasswordInput
          label={t('newPassword.confirmPasswordLabel')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('newPassword.confirmPasswordPlaceholder')}
          error={
            passwordMismatch ? t('newPassword.passwordMismatch') : undefined
          }
          disabled={loading}
        />

        <Button
          label={t('newPassword.submitButton')}
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
          className="mb-6"
        />

        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            className="items-center"
            accessibilityRole="button"
          >
            <Text className="text-primary-400 text-sm">
              {t('mfaSetup.back')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Card>
    </ScrollView>
  );
}
