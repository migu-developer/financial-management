import React, { useCallback, useEffect, useRef, useState } from 'react';

import { AuthChallengeType } from '@features/auth/domain/repositories/auth-repository.port';

import { MfaSetupTemplate } from '@features/auth/presentation/components/shared/templates/mfa-setup-template';
import { useAuth } from '@features/auth/presentation/providers/auth-provider';

export interface MfaSetupPageProps {
  onSetupSuccess: () => void;
  onSkip?: () => void;
}

export function MfaSetupPage({ onSetupSuccess, onSkip }: MfaSetupPageProps) {
  const {
    pendingChallenge,
    associateSoftwareToken,
    verifySoftwareToken,
    loading,
    error,
  } = useAuth();
  const [setupData, setSetupData] = useState<{
    secretCode: string;
    qrCodeUrl: string;
  } | null>(null);
  const initialized = useRef(false);

  const session =
    pendingChallenge?.type === AuthChallengeType.MFA_SETUP
      ? pendingChallenge.session
      : '';

  useEffect(() => {
    if (!session || initialized.current) return;
    initialized.current = true;
    associateSoftwareToken(session)
      .then((data) => setSetupData(data))
      .catch(() => {});
  }, [session, associateSoftwareToken]);

  const handleActivate = useCallback(
    async (code: string, deviceName: string) => {
      if (!session) return;
      try {
        await verifySoftwareToken(session, code, deviceName);
        onSetupSuccess();
      } catch {
        // error stored in auth state
      }
    },
    [session, verifySoftwareToken, onSetupSuccess],
  );

  if (
    !pendingChallenge ||
    pendingChallenge.type !== AuthChallengeType.MFA_SETUP ||
    !setupData
  ) {
    return null;
  }

  return (
    <MfaSetupTemplate
      secretCode={setupData.secretCode}
      qrCodeUrl={setupData.qrCodeUrl}
      onActivate={handleActivate}
      onSkip={onSkip}
      loading={loading}
      error={error?.message}
    />
  );
}
