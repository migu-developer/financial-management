import { useCallback, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useAuth, ConfirmForgotPasswordTemplate } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function ForgotPasswordConfirmScreen() {
  const router = useRouter();
  const { destination = '', identifier = '' } = useLocalSearchParams<{
    destination: string;
    medium: string;
    identifier: string;
  }>();
  const { confirmForgotPassword, initiateForgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // `identifier` is the original email/phone the user typed.
  // `dest` is Cognito's masked address used only for display.
  const dest = String(destination);
  const originalIdentifier = String(identifier) || dest;

  const handleSubmit = useCallback(
    async (code: string, newPassword: string) => {
      setError(undefined);
      setLoading(true);
      try {
        await confirmForgotPassword(originalIdentifier, code, newPassword);
        router.replace(ROUTES.authLogin as never);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [originalIdentifier, confirmForgotPassword, router],
  );

  const handleResend = useCallback(async () => {
    try {
      await initiateForgotPassword(originalIdentifier);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [originalIdentifier, initiateForgotPassword]);

  return (
    <ConfirmForgotPasswordTemplate
      destination={dest}
      onSubmit={handleSubmit}
      onResend={handleResend}
      onBack={() => router.replace(ROUTES.authForgotPassword as never)}
      loading={loading}
      error={error}
    />
  );
}
