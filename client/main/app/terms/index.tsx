import { useRouter } from 'expo-router';

import { TermsPage } from '@features/landing';

export default function TermsScreen() {
  const router = useRouter();

  return <TermsPage onBackPress={() => router.back()} />;
}
