import { useRouter } from 'expo-router';

import { RegisterPage } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <RegisterPage onBack={() => router.replace(ROUTES.authLogin as never)} />
  );
}
