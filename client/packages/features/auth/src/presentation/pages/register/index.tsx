import React, { useCallback, useState } from 'react';

import type { SocialProvider } from '@features/ui';

import { useTranslation } from '@packages/i18n';

import { RegisterTemplate } from '@features/auth/presentation/components/shared/templates/register-template';
import type { SignUpDto } from '@features/auth/domain/repositories/auth-repository.port';

import { useAuth } from '@features/auth/presentation/providers/auth-provider';

export interface RegisterPageProps {
  onRegisterSuccess: (identifier: string, phone: string) => void;
  onSignIn: () => void;
  onPressTerms?: () => void;
  onPressPrivacy?: () => void;
}

export function RegisterPage({
  onRegisterSuccess,
  onSignIn,
  onPressTerms,
  onPressPrivacy,
}: RegisterPageProps) {
  const { signUp } = useAuth();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleRegister = useCallback(
    async (dto: SignUpDto) => {
      setError(undefined);
      setLoading(true);
      try {
        await signUp({ ...dto, locale: i18n.language });
        onRegisterSuccess(dto.email, dto.phoneNumber ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [signUp, onRegisterSuccess, i18n],
  );

  const handleSocialSignIn = useCallback((_provider: SocialProvider) => {
    // OAuth flow — to be implemented in Fase 7
    console.log('social sign in', _provider);
  }, []);

  return (
    <RegisterTemplate
      onRegister={handleRegister}
      onSignIn={onSignIn}
      onSocialSignIn={handleSocialSignIn}
      onPressTerms={onPressTerms}
      onPressPrivacy={onPressPrivacy}
      loading={loading}
      error={error}
    />
  );
}
