import { useCallback, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useAuth, ConfirmSignUpTemplate, IdentifierType } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function RegisterConfirmScreen() {
  const router = useRouter();
  const { identifier = '' } = useLocalSearchParams<{ identifier: string }>();
  const { confirmSignUp, resendConfirmation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const id = String(identifier);
  const medium = id.startsWith('+')
    ? IdentifierType.PHONE
    : IdentifierType.EMAIL;

  const handleVerify = useCallback(
    async (code: string) => {
      setError(undefined);
      setLoading(true);
      try {
        await confirmSignUp(id, code);
        router.replace(ROUTES.authLogin as never);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [id, confirmSignUp, router],
  );

  const handleResend = useCallback(async () => {
    try {
      await resendConfirmation(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [id, resendConfirmation]);

  return (
    <ConfirmSignUpTemplate
      destination={id}
      medium={medium}
      onVerify={handleVerify}
      onResend={handleResend}
      onBack={() => router.replace(ROUTES.authRegister as never)}
      loading={loading}
      error={error}
    />
  );
}
