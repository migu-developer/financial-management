import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useTranslation } from '@packages/i18n';

import {
  Button,
  Card,
  FormInput,
  LanguageSelector,
  SocialAuthButton,
  ThemeToggle,
} from '@features/ui';
import type { SocialProvider } from '@features/ui';

import { PasswordStrength } from '@features/auth/presentation/components/shared/atoms/password-strength';
import { PhoneInput } from '@features/auth/presentation/components/shared/atoms/phone-input';
import {
  NotificationChannelEnum,
  NotificationPreference,
} from '@features/auth/presentation/components/shared/molecules/notification-preference';
import { TermsConsent } from '@features/auth/presentation/components/shared/molecules/terms-consent';
import type { NotificationChannel } from '@features/auth/presentation/components/shared/molecules/notification-preference';
import type { SignUpDto } from '@features/auth/domain/repositories/auth-repository.port';

export interface RegisterTemplateProps {
  onRegister: (dto: SignUpDto) => void;
  onSignIn: () => void;
  onPressTerms?: () => void;
  onPressPrivacy?: () => void;
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterTemplate({
  onRegister,
  onSignIn,
  onPressTerms,
  onPressPrivacy,
  onSocialSignIn,
  loading = false,
  error,
}: RegisterTemplateProps) {
  const { t } = useTranslation('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notificationChannel, setNotificationChannel] =
    useState<NotificationChannel>(NotificationChannelEnum.EMAIL);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isEmailValid = email.trim() === '' || EMAIL_REGEX.test(email.trim());
  const emailError =
    emailTouched && !isEmailValid ? t('register.emailInvalid') : undefined;

  const phoneRequiredForSms =
    notificationChannel !== NotificationChannelEnum.EMAIL && phone === '';

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const canSubmit = useMemo(
    () =>
      name.trim() !== '' &&
      email.trim() !== '' &&
      EMAIL_REGEX.test(email.trim()) &&
      password !== '' &&
      confirmPassword !== '' &&
      password === confirmPassword &&
      termsAccepted &&
      !phoneRequiredForSms,
    [
      name,
      email,
      password,
      confirmPassword,
      termsAccepted,
      phoneRequiredForSms,
    ],
  );

  const handleSubmit = useCallback(() => {
    onRegister({
      email,
      password,
      name: name.trim() || undefined,
      phoneNumber: phone || undefined,
      notificationPreference: phone ? notificationChannel : undefined,
    });
  }, [email, password, name, phone, notificationChannel, onRegister]);

  const handlePhoneChange = useCallback((e164: string) => {
    setPhone(e164);
  }, []);

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
            {t('register.title')}
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-base">
            {t('register.subtitle')}
          </Text>
        </View>

        {error ? (
          <View className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm">{error}</Text>
          </View>
        ) : null}

        <FormInput
          label={t('register.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('register.namePlaceholder')}
          autoCapitalize="words"
          disabled={loading}
        />

        <FormInput
          label={t('register.emailLabel')}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (!emailTouched) setEmailTouched(true);
          }}
          placeholder={t('register.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          disabled={loading}
          error={emailError}
        />

        <PhoneInput
          label={t('register.phoneLabel')}
          value={phone}
          onChange={handlePhoneChange}
          placeholder={t('register.phonePlaceholder')}
          disabled={loading}
          error={
            phoneRequiredForSms ? t('register.phoneRequiredForSms') : undefined
          }
        />

        <NotificationPreference
          value={notificationChannel}
          onChange={setNotificationChannel}
          disabled={loading}
        />

        <FormInput
          label={t('register.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('register.passwordPlaceholder')}
          secureTextEntry
          showPasswordToggle
          disabled={loading}
        />

        <PasswordStrength password={password} />

        <FormInput
          label={t('register.confirmPasswordLabel')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('register.confirmPasswordPlaceholder')}
          secureTextEntry
          showPasswordToggle
          error={
            passwordMismatch ? t('newPassword.passwordMismatch') : undefined
          }
          disabled={loading}
        />

        <TermsConsent
          accepted={termsAccepted}
          onChange={setTermsAccepted}
          onPressTerms={onPressTerms}
          onPressPrivacy={onPressPrivacy}
        />

        <Button
          label={t('register.submitButton')}
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
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
            {t('register.alreadyHaveAccount')}{' '}
          </Text>
          <TouchableOpacity onPress={onSignIn} accessibilityRole="button">
            <Text className="text-primary-400 text-sm font-semibold">
              {t('register.signIn')}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );
}
