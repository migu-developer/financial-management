import { useRouter } from 'expo-router';

import { PrivacyPage } from '@features/landing';
import { ROUTES } from '@/utils/route';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <PrivacyPage onBackPress={() => router.replace(ROUTES.landing as never)} />
  );
}
