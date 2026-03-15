import React, { useCallback } from 'react';

import { AuthChallengeType } from '@features/auth/domain/repositories/auth-repository.port';

import { NewPasswordTemplate } from '@features/auth/presentation/components/shared/templates/new-password-template';
import { useAuth } from '@features/auth/presentation/providers/auth-provider';

export interface NewPasswordPageProps {
  onSignInSuccess: () => void;
  onMfaRequired: () => void;
  onMfaSetupRequired: () => void;
  onBack?: () => void;
}

export function NewPasswordPage({
  onSignInSuccess,
  onMfaRequired,
  onMfaSetupRequired,
  onBack,
}: NewPasswordPageProps) {
  const { pendingChallenge, respondToNewPassword, loading, error } = useAuth();

  const session =
    pendingChallenge?.type === AuthChallengeType.NEW_PASSWORD_REQUIRED
      ? pendingChallenge.session
      : '';

  const handleSubmit = useCallback(
    async (newPassword: string) => {
      if (!session) return;
      try {
        const result = await respondToNewPassword(session, newPassword);
        switch (result.type) {
          case AuthChallengeType.SESSION:
            onSignInSuccess();
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
      session,
      respondToNewPassword,
      onSignInSuccess,
      onMfaRequired,
      onMfaSetupRequired,
    ],
  );

  if (
    !pendingChallenge ||
    pendingChallenge.type !== AuthChallengeType.NEW_PASSWORD_REQUIRED
  ) {
    return null;
  }

  return (
    <NewPasswordTemplate
      onSubmit={handleSubmit}
      onBack={onBack}
      loading={loading}
      error={error?.message}
    />
  );
}
