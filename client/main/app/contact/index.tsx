import { useRouter } from 'expo-router';

import { ContactPage } from '@features/landing';

export default function ContactScreen() {
  const router = useRouter();

  return <ContactPage onBackPress={() => router.back()} />;
}
