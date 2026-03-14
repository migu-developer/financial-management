import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTranslation } from '@packages/i18n';

import {
  Button,
  Card,
  FormInput,
  InfoPopup,
  LanguageSelector,
  maxWidth,
  PasswordInput,
  SocialAuthButton,
  space,
  ThemeToggle,
  useThemeActions,
} from '@features/ui';
import type { SocialProvider } from '@features/ui';
import {
  generic,
  primary,
  textTokens,
  uiTokens,
} from '@features/ui/utils/colors';
import { ColorScheme } from '@features/ui/utils/constants';

import { PasswordStrength } from '@features/auth/presentation/components/shared/atoms/password-strength';
import { PhoneInput } from '@features/auth/presentation/components/shared/atoms/phone-input';
import { TermsConsent } from '@features/auth/presentation/components/shared/molecules/terms-consent';
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
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [phoneInfoVisible, setPhoneInfoVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isEmailValid = email.trim() === '' || EMAIL_REGEX.test(email.trim());
  const emailError =
    emailTouched && !isEmailValid ? t('register.emailInvalid') : undefined;

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
      termsAccepted,
    [name, email, password, confirmPassword, termsAccepted],
  );

  const handleSubmit = useCallback(() => {
    onRegister({
      email,
      password,
      name: name.trim() || undefined,
      phoneNumber: phone || undefined,
    });
  }, [email, password, name, phone, onRegister]);

  const handlePhoneChange = useCallback((e164: string) => {
    setPhone(e164);
  }, []);

  const handleTogglePhone = useCallback((value: boolean) => {
    setShowPhone(value);
    if (!value) {
      setPhone('');
    }
  }, []);

  const iconColor = isDark ? uiTokens.moonColor : textTokens.light.muted;

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

        {/* Phone toggle + conditional input */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                {t('register.addPhoneToggle')}
              </Text>
              <TouchableOpacity
                onPress={() => setPhoneInfoVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('register.addPhoneInfoTitle')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color={iconColor}
                />
              </TouchableOpacity>
            </View>
            <Switch
              value={showPhone}
              onValueChange={handleTogglePhone}
              disabled={loading}
              trackColor={{
                false: textTokens.dark.secondary,
                true: primary[400],
              }}
              thumbColor={generic.white}
            />
          </View>

          {showPhone ? (
            <View className="mt-3">
              <PhoneInput
                label={t('register.phoneLabel')}
                value={phone}
                onChange={handlePhoneChange}
                placeholder={t('register.phonePlaceholder')}
                disabled={loading}
              />
            </View>
          ) : null}
        </View>

        <PasswordInput
          label={t('register.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('register.passwordPlaceholder')}
          disabled={loading}
        />

        <PasswordStrength password={password} />

        <PasswordInput
          label={t('register.confirmPasswordLabel')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('register.confirmPasswordPlaceholder')}
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

      <InfoPopup
        visible={phoneInfoVisible}
        onClose={() => setPhoneInfoVisible(false)}
        title={t('register.addPhoneInfoTitle')}
        body={t('register.addPhoneInfoBody')}
        closeLabel={t('register.addPhoneInfoClose')}
      />
    </ScrollView>
  );
}
