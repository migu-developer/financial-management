import React, { useCallback, useState } from 'react';

import { useTranslation } from '@packages/i18n';

import { RegisterTemplate } from '@features/auth/presentation/components/shared/templates/register-template';
import type { SignUpDto } from '@features/auth/domain/repositories/auth-repository.port';

import { useAuth } from '@features/auth/presentation/providers/auth-provider';
import { useSocialSignIn } from '@features/auth/presentation/hooks/use-social-sign-in';

export interface RegisterPageProps {
  onRegisterSuccess: (identifier: string, phone: string) => void;
  onSignIn: () => void;
  onSocialSignInSuccess?: () => void;
  onPressTerms?: () => void;
  onPressPrivacy?: () => void;
}

export function RegisterPage({
  onRegisterSuccess,
  onSignIn,
  onSocialSignInSuccess,
  onPressTerms,
  onPressPrivacy,
}: RegisterPageProps) {
  const { signUp } = useAuth();
  const { i18n } = useTranslation();
  const { initiate: initiateSocialSignIn, loading: socialLoading } =
    useSocialSignIn(onSocialSignInSuccess ?? (() => {}), i18n.language);
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

  return (
    <RegisterTemplate
      onRegister={handleRegister}
      onSignIn={onSignIn}
      onSocialSignIn={initiateSocialSignIn}
      onPressTerms={onPressTerms}
      onPressPrivacy={onPressPrivacy}
      loading={loading || socialLoading}
      error={error}
    />
  );
}
