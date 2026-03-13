import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { Button, Card } from '@features/ui';

import { OtpInput } from '@features/auth/presentation/components/shared/atoms/otp-input';
import { IdentifierType } from '@features/auth/domain/utils/constants';

const RESEND_COOLDOWN_S = 60;

export type Medium = (typeof IdentifierType)[keyof typeof IdentifierType];

export interface ConfirmSignUpTemplateProps {
  destination: string;
  medium: Medium;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  loading?: boolean;
  error?: string;
}

export function ConfirmSignUpTemplate({
  destination,
  medium,
  onVerify,
  onResend,
  onBack,
  loading = false,
  error,
}: ConfirmSignUpTemplateProps) {
  const { t } = useTranslation('login');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Self-rescheduling countdown: each second decrements by 1 until 0
  useEffect(() => {
    if (cooldown <= 0) return;
    const timeout = setTimeout(() => setCooldown((s) => s - 1), 1_000);
    return () => clearTimeout(timeout);
  }, [cooldown]);

  const handleResend = useCallback(() => {
    onResend();
    setCooldown(RESEND_COOLDOWN_S);
  }, [onResend]);

  const handleVerify = useCallback(() => {
    onVerify(code);
  }, [code, onVerify]);

  const subtitle =
    medium === IdentifierType.PHONE
      ? t('confirmSignUp.subtitlePhone', { destination })
      : t('confirmSignUp.subtitleEmail', { destination });

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
            {t('confirmSignUp.title')}
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-base">
            {subtitle}
          </Text>
        </View>

        {error ? (
          <View className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        ) : null}

        <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-3">
          {t('confirmSignUp.codeLabel')}
        </Text>

        <OtpInput
          value={code}
          onChange={setCode}
          disabled={loading}
          error={!!error}
        />

        <Button
          label={t('confirmSignUp.submitButton')}
          onPress={handleVerify}
          loading={loading}
          disabled={code.length < 6}
          className="mt-6 mb-4"
        />

        <View className="flex-row justify-center items-center gap-1">
          <Text className="text-slate-500 dark:text-slate-400 text-sm">
            {t('confirmSignUp.resendCode')}
          </Text>
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
              <Text className="text-primary-400 text-sm font-semibold">
                {t('confirmSignUp.resendButton')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={onBack}
          className="items-center mt-4"
          accessibilityRole="button"
        >
          <Text className="text-primary-400 text-sm">
            {t('confirmSignUp.back')}
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}
