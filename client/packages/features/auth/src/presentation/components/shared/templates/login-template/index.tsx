import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import { Button, Card, FormInput, SocialAuthButton } from '@features/ui';
import type { SocialProvider } from '@features/ui';

interface LoginTemplateProps {
  onSignIn: (email: string, password: string) => void;
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

        <FormInput
          label={t('emailLabel')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <FormInput
          label={t('passwordLabel')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('passwordPlaceholder')}
          secureTextEntry
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
          onPress={() => onSignIn(email, password)}
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
            label={t(`social.${provider}` as never)}
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
