import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import {
  Button,
  Card,
  LanguageSelector,
  maxWidth,
  space,
  PasswordInput,
  SocialAuthButton,
  ThemeToggle,
} from '@features/ui';
import type { SocialProvider } from '@features/ui';

import { IdentifierInput } from '@features/auth/presentation/components/shared/molecules/identifier-input';

import { IdentifierType as IdentifierTypeEnum } from '@features/auth/domain/utils/constants';

type IdentifierType =
  (typeof IdentifierTypeEnum)[keyof typeof IdentifierTypeEnum];

export interface LoginTemplateProps {
  onSignIn: (identifier: string, password: string) => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
  onSocialSignIn: (provider: SocialProvider) => void;
  loading?: boolean;
  error?: string;
}

const SOCIAL_PROVIDERS: SocialProvider[] = [
  'google',
  'facebook',
  'microsoft',
  'apple',
];

export function LoginTemplate({
  onSignIn,
  onForgotPassword,
  onSignUp,
  onSocialSignIn,
  loading = false,
  error,
}: LoginTemplateProps) {
  const { t } = useTranslation('login');
  const [identifier, setIdentifier] = useState('');
  const [identifierError, setIdentifierError] = useState<string | undefined>();
  const [password, setPassword] = useState('');

  const handleIdentifierChange = useCallback(
    (value: string, type: IdentifierType) => {
      setIdentifier(value);
      if (type === IdentifierTypeEnum.EMAIL && value.length > 0) {
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
        setIdentifierError(
          valid ? undefined : t('identifierInput.invalidEmail'),
        );
      } else {
        setIdentifierError(undefined);
      }
    },
    [t],
  );

  const handleSubmit = useCallback(() => {
    onSignIn(identifier, password);
  }, [identifier, password, onSignIn]);

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
            {t('title')}
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-base">
            {t('subtitle')}
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
          error={identifierError}
          disabled={loading}
        />

        <PasswordInput
          label={t('passwordLabel')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('passwordPlaceholder')}
          disabled={loading}
        />

        <TouchableOpacity
          onPress={onForgotPassword}
          className="self-end mb-6"
          accessibilityRole="button"
        >
          <Text className="text-primary-400 text-sm">
            {t('forgotPassword')}
          </Text>
        </TouchableOpacity>

        <Button
          label={t('signInButton')}
          onPress={handleSubmit}
          loading={loading}
          className="mb-6"
        />

        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <Text className="text-slate-500 dark:text-slate-500 text-sm mx-4">
            {t('or')}
          </Text>
          <View className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </View>

        {SOCIAL_PROVIDERS.map((provider) => (
          <SocialAuthButton
            key={provider}
            provider={provider}
            label={t(`social.${provider}`)}
            onPress={() => onSocialSignIn(provider)}
            disabled={loading}
          />
        ))}

        <View className="flex-row justify-center mt-6">
          <Text className="text-slate-500 dark:text-slate-400 text-sm">
            {t('noAccount')}{' '}
          </Text>
          <TouchableOpacity onPress={onSignUp} accessibilityRole="button">
            <Text className="text-primary-400 text-sm font-semibold">
              {t('signUp')}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );
}
