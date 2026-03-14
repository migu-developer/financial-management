import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import {
  Button,
  Card,
  LanguageSelector,
  maxWidth,
  space,
  ThemeToggle,
} from '@features/ui';

import { OtpInput } from '@features/auth/presentation/components/shared/atoms/otp-input';
import {
  AuthChallengeType,
  type MfaType,
} from '@features/auth/domain/repositories/auth-repository.port';

const RESEND_COOLDOWN_S = 60;

export interface MfaVerifyTemplateProps {
  type: MfaType;
  destination?: string;
  onVerify: (code: string) => void;
  onResendSms?: () => void;
  onBack: () => void;
  loading?: boolean;
  error?: string;
}

export function MfaVerifyTemplate({
  type,
  destination,
  onVerify,
  onResendSms,
  onBack,
  loading = false,
  error,
}: MfaVerifyTemplateProps) {
  const { t } = useTranslation('login');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timeout = setTimeout(() => setCooldown((s) => s - 1), 1_000);
    return () => clearTimeout(timeout);
  }, [cooldown]);

  const handleVerify = useCallback(() => {
    onVerify(code);
  }, [code, onVerify]);

  const handleResendSms = useCallback(() => {
    onResendSms?.();
    setCooldown(RESEND_COOLDOWN_S);
  }, [onResendSms]);

  const isSms = type === AuthChallengeType.SMS_MFA;
  const title = isSms ? t('mfaVerify.titleSms') : t('mfaVerify.titleTotp');
  const subtitle = isSms
    ? t('mfaVerify.subtitleSms', { destination: destination ?? '' })
    : t('mfaVerify.subtitleTotp');

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
            {title}
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
          {t('mfaVerify.codeLabel')}
        </Text>

        <OtpInput
          value={code}
          onChange={setCode}
          disabled={loading}
          error={!!error}
        />

        {isSms && onResendSms ? (
          <View className="items-end mt-2 mb-4">
            {cooldown > 0 ? (
              <Text className="text-slate-400 dark:text-slate-500 text-sm">
                {t('confirmSignUp.resendCooldown', { seconds: cooldown })}
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendSms}
                disabled={loading}
                accessibilityRole="button"
              >
                <Text className="text-primary-400 text-sm">
                  {t('confirmSignUp.resendButton')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="mb-4" />
        )}

        <Button
          label={t('mfaVerify.submitButton')}
          onPress={handleVerify}
          loading={loading}
          disabled={code.length < 6}
          className="mb-6"
        />

        <TouchableOpacity
          onPress={onBack}
          className="items-center"
          accessibilityRole="button"
        >
          <Text className="text-primary-400 text-sm">
            {t('mfaVerify.back')}
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}
