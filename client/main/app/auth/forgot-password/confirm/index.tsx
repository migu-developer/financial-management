import { useCallback, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useAuth, ConfirmForgotPasswordTemplate } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function ForgotPasswordConfirmScreen() {
  const router = useRouter();
  const { destination = '' } = useLocalSearchParams<{
    destination: string;
    medium: string;
  }>();
  const { confirmForgotPassword, initiateForgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const dest = String(destination);

  const handleSubmit = useCallback(
    async (code: string, newPassword: string) => {
      setError(undefined);
      setLoading(true);
      try {
        await confirmForgotPassword(dest, code, newPassword);
        router.replace(ROUTES.authLogin as never);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [dest, confirmForgotPassword, router],
  );

  const handleResend = useCallback(async () => {
    try {
      await initiateForgotPassword(dest);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [dest, initiateForgotPassword]);

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
