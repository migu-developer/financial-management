import React, { useCallback } from 'react';

import {
  AuthChallengeType,
  type MfaType,
} from '@features/auth/domain/repositories/auth-repository.port';

import { MfaVerifyTemplate } from '@features/auth/presentation/components/shared/templates/mfa-verify-template';
import { useAuth } from '@features/auth/presentation/providers/auth-provider';

export interface MfaVerifyPageProps {
  onVerifySuccess: () => void;
  onBack: () => void;
}

export function MfaVerifyPage({ onVerifySuccess, onBack }: MfaVerifyPageProps) {
  const { pendingChallenge, respondToMfa, loading, error } = useAuth();

  const isSms = pendingChallenge?.type === AuthChallengeType.SMS_MFA;
  const isTotp =
    pendingChallenge?.type === AuthChallengeType.SOFTWARE_TOKEN_MFA;
  const session = isSms || isTotp ? pendingChallenge!.session : '';
  const type = (
    isSms || isTotp
      ? pendingChallenge!.type
      : AuthChallengeType.SOFTWARE_TOKEN_MFA
  ) as MfaType;
  const destination = isSms
    ? (pendingChallenge as { destination: string }).destination
    : undefined;

  const handleVerify = useCallback(
    async (code: string) => {
      if (!session) return;
      try {
        await respondToMfa(session, code, type);
        onVerifySuccess();
      } catch {
        // error stored in auth state
      }
    },
    [session, type, respondToMfa, onVerifySuccess],
  );

  if (!pendingChallenge || (!isSms && !isTotp)) {
    return null;
  }

  return (
    <MfaVerifyTemplate
      type={type}
      destination={destination}
      onVerify={handleVerify}
      onBack={onBack}
      loading={loading}
      error={error?.message}
    />
  );
}
