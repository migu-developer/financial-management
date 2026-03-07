import { useRouter } from 'expo-router';

import { PrivacyPage } from '@features/landing';

export default function PrivacyScreen() {
  const router = useRouter();

  return <PrivacyPage onBackPress={() => router.back()} />;
}
