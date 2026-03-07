import { useRouter } from 'expo-router';

import { ForgotPasswordPage } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <ForgotPasswordPage
      onBack={() => router.replace(ROUTES.authLogin as never)}
    />
  );
}
