import { useRouter } from 'expo-router';

import { TermsPage } from '@features/landing';
import { ROUTES } from '@/utils/route';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <TermsPage onBackPress={() => router.replace(ROUTES.landing as never)} />
  );
}
