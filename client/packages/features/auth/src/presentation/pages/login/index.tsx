import React, { useCallback } from 'react';

import { useTranslation } from '@packages/i18n';

import { LoginTemplate } from '@features/auth/presentation/components/shared/templates/login-template';
import { AuthChallengeType } from '@features/auth/domain/repositories/auth-repository.port';
import { useAuth } from '@features/auth/presentation/providers/auth-provider';
import { useSocialSignIn } from '@features/auth/presentation/hooks/use-social-sign-in';

export interface LoginPageProps {
  onForgotPassword: () => void;
  onSignUp: () => void;
  onSignInSuccess: () => void;
  onNewPasswordRequired: () => void;
  onMfaRequired: () => void;
  onMfaSetupRequired: () => void;
}

export function LoginPage({
  onForgotPassword,
  onSignUp,
  onSignInSuccess,
  onNewPasswordRequired,
  onMfaRequired,
  onMfaSetupRequired,
}: LoginPageProps) {
  const { signIn, loading, error } = useAuth();
  const { i18n } = useTranslation();
  const { initiate: initiateSocialSignIn, loading: socialLoading } =
    useSocialSignIn(onSignInSuccess, i18n.language);

  const handleSignIn = useCallback(
    async (identifier: string, password: string) => {
      try {
        const result = await signIn(identifier, password);
        switch (result.type) {
          case AuthChallengeType.SESSION:
            onSignInSuccess();
            break;
          case AuthChallengeType.NEW_PASSWORD_REQUIRED:
            onNewPasswordRequired();
            break;
          case AuthChallengeType.SOFTWARE_TOKEN_MFA:
          case AuthChallengeType.SMS_MFA:
            onMfaRequired();
            break;
          case AuthChallengeType.MFA_SETUP:
            onMfaSetupRequired();
            break;
        }
      } catch {
        // error stored in auth state
      }
    },
    [
      signIn,
      onSignInSuccess,
      onNewPasswordRequired,
      onMfaRequired,
      onMfaSetupRequired,
    ],
  );

  return (
    <LoginTemplate
      onSignIn={handleSignIn}
      onSocialSignIn={initiateSocialSignIn}
      onForgotPassword={onForgotPassword}
      onSignUp={onSignUp}
      loading={loading || socialLoading}
      error={error?.message}
    />
  );
}
