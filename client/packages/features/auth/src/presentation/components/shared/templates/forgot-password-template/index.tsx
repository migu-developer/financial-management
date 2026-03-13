import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { Button, Card, LanguageSelector, ThemeToggle } from '@features/ui';

import { IdentifierInput } from '@features/auth/presentation/components/shared/molecules/identifier-input';

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
  const [identifier, setIdentifier] = useState('');

  const handleIdentifierChange = useCallback((value: string) => {
    setIdentifier(value);
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(identifier);
  }, [identifier, onSubmit]);

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
      {/* Language / Theme bar */}
      <View
        className="w-full flex-row justify-end gap-2 mb-4"
        style={{ maxWidth: 448 }}
      >
        <LanguageSelector />
        <ThemeToggle />
      </View>

      <Card className="w-full p-6" style={{ maxWidth: 448 }}>
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

        <IdentifierInput
          value={identifier}
          onChangeIdentifier={handleIdentifierChange}
          disabled={loading}
        />

        <Button
          label={t('forgotPasswordPage.submitButton')}
          onPress={handleSubmit}
          loading={loading}
          disabled={identifier.trim() === ''}
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
