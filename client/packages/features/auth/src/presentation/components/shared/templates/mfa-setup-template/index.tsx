import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { Button, Card, FormInput } from '@features/ui';

import { OtpInput } from '@features/auth/presentation/components/shared/atoms/otp-input';
import { QrCode } from '@features/auth/presentation/components/shared/atoms/qr-code';

export interface MfaSetupTemplateProps {
  secretCode: string;
  qrCodeUrl: string;
  onActivate: (code: string, deviceName: string) => void;
  onSkip?: () => void;
  loading?: boolean;
  error?: string;
}

export function MfaSetupTemplate({
  secretCode,
  qrCodeUrl,
  onActivate,
  onSkip,
  loading = false,
  error,
}: MfaSetupTemplateProps) {
  const { t } = useTranslation('login');
  const [code, setCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const canSubmit = code.length === 6 && deviceName.trim() !== '';

  const handleActivate = useCallback(() => {
    onActivate(code, deviceName.trim());
  }, [code, deviceName, onActivate]);

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-900"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        padding: 24,
        paddingTop: 40,
      }}
    >
      <Card className="w-full p-6" style={{ maxWidth: 448 }}>
        <View className="mb-6">
          <Text className="text-slate-900 dark:text-white font-bold text-3xl mb-2">
            {t('mfaSetup.title')}
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-base">
            {t('mfaSetup.subtitle')}
          </Text>
        </View>

        {error ? (
          <View className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Step 1: QR Code */}
        <Text className="text-slate-700 dark:text-slate-200 font-semibold text-base mb-2">
          {t('mfaSetup.step1')}
        </Text>
        <Text className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t('mfaSetup.step1Description')}
        </Text>

        <View className="items-center mb-4">
          <QrCode value={qrCodeUrl} size={200} />
        </View>

        {/* Manual secret key — selectable so the user can copy it */}
        <View className="mb-6">
          <Text className="text-slate-500 dark:text-slate-400 text-sm mb-2">
            {t('mfaSetup.secretLabel')}
          </Text>
          <View className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
            <Text
              selectable
              className="text-slate-700 dark:text-slate-300 font-mono text-sm"
            >
              {secretCode}
            </Text>
          </View>
        </View>

        {/* Step 2: Enter code */}
        <Text className="text-slate-700 dark:text-slate-200 font-semibold text-base mb-2">
          {t('mfaSetup.step2')}
        </Text>

        <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-3">
          {t('mfaSetup.codeLabel')}
        </Text>

        <OtpInput
          value={code}
          onChange={setCode}
          disabled={loading}
          error={!!error}
        />

        <FormInput
          label={t('mfaSetup.deviceNameLabel')}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder={t('mfaSetup.deviceNamePlaceholder')}
          autoCapitalize="words"
          disabled={loading}
          className="mt-4 mb-4"
        />

        <Button
          label={t('mfaSetup.submitButton')}
          onPress={handleActivate}
          loading={loading}
          disabled={!canSubmit}
          className="mb-4"
        />

        {onSkip ? (
          <TouchableOpacity
            onPress={onSkip}
            className="items-center"
            accessibilityRole="button"
          >
            <Text className="text-slate-400 dark:text-slate-500 text-sm">
              {t('mfaSetup.back')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Card>
    </ScrollView>
  );
}
