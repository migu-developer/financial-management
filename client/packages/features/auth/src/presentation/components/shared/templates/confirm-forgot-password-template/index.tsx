import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { Button, Card, FormInput } from '@features/ui';

import { OtpInput } from '@features/auth/presentation/components/shared/atoms/otp-input';
import { PasswordStrength } from '@features/auth/presentation/components/shared/atoms/password-strength';

const RESEND_COOLDOWN_S = 60;

export interface ConfirmForgotPasswordTemplateProps {
  destination: string;
  onSubmit: (code: string, newPassword: string) => void;
  onResend: () => void;
  onBack: () => void;
  loading?: boolean;
  error?: string;
}

export function ConfirmForgotPasswordTemplate({
  destination,
  onSubmit,
  onResend,
  onBack,
  loading = false,
  error,
}: ConfirmForgotPasswordTemplateProps) {
  const { t } = useTranslation('login');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timeout = setTimeout(() => setCooldown((s) => s - 1), 1_000);
    return () => clearTimeout(timeout);
  }, [cooldown]);

  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const canSubmit =
    code.length === 6 &&
    newPassword !== '' &&
    confirmPassword !== '' &&
    newPassword === confirmPassword;

  const handleSubmit = useCallback(() => {
    onSubmit(code, newPassword);
  }, [code, newPassword, onSubmit]);

  const handleResend = useCallback(() => {
    onResend();
    setCooldown(RESEND_COOLDOWN_S);
  }, [onResend]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-900"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}
    >
      <Card className="w-full p-6" style={{ maxWidth: 448 }}>
        <View className="mb-8">
          <Text className="text-slate-900 dark:text-white font-bold text-3xl mb-2">
            {t('confirmForgotPassword.title')}
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-base">
            {t('confirmForgotPassword.subtitle', { destination })}
          </Text>
        </View>

        {error ? (
          <View className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        ) : null}

        <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-3">
          {t('confirmForgotPassword.codeLabel')}
        </Text>

        <OtpInput
          value={code}
          onChange={setCode}
          disabled={loading}
          error={!!error}
        />

        <View className="flex-row justify-end items-center mt-2 mb-4">
          {cooldown > 0 ? (
            <Text className="text-slate-400 dark:text-slate-500 text-sm">
              {t('confirmSignUp.resendCooldown', { seconds: cooldown })}
            </Text>
          ) : (
            <TouchableOpacity
              onPress={handleResend}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text className="text-primary-400 text-sm">
                {t('confirmSignUp.resendButton')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <FormInput
          label={t('confirmForgotPassword.newPasswordLabel')}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('confirmForgotPassword.newPasswordPlaceholder')}
          secureTextEntry
          disabled={loading}
        />

        <PasswordStrength password={newPassword} />

        <FormInput
          label={t('confirmForgotPassword.confirmPasswordLabel')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('confirmForgotPassword.confirmPasswordPlaceholder')}
          secureTextEntry
          error={
            passwordMismatch
              ? t('confirmForgotPassword.passwordMismatch')
              : undefined
          }
          disabled={loading}
        />

        <Button
          label={t('confirmForgotPassword.submitButton')}
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
          className="mb-6"
        />

        <TouchableOpacity
          onPress={onBack}
          className="items-center"
          accessibilityRole="button"
        >
          <Text className="text-primary-400 text-sm">
            {t('confirmForgotPassword.back')}
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}
