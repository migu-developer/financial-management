import React, { useCallback, useState } from 'react';

import { ForgotPasswordTemplate } from '@features/auth/presentation/components/shared/templates/forgot-password-template';

import { useAuth } from '@features/auth/presentation/providers/auth-provider';

export interface ForgotPasswordPageProps {
  onBack: () => void;
  /**
   * Called after Cognito sends the reset code.
   * @param destination - Cognito's masked delivery address (for display only)
   * @param medium - 'email' | 'sms'
   * @param identifier - The original identifier the user typed (used for confirmForgotPassword)
   */
  onSubmitSuccess: (
    destination: string,
    medium: string,
    identifier: string,
  ) => void;
}

export function ForgotPasswordPage({
  onBack,
  onSubmitSuccess,
}: ForgotPasswordPageProps) {
  const { initiateForgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = useCallback(
    async (identifier: string) => {
      setError(undefined);
      setLoading(true);
      try {
        const delivery = await initiateForgotPassword(identifier);
        onSubmitSuccess(delivery.destination, delivery.medium, identifier);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [initiateForgotPassword, onSubmitSuccess],
  );

  return (
    <ForgotPasswordTemplate
      onSubmit={handleSubmit}
      onBack={onBack}
      loading={loading}
      error={error}
    />
  );
}
