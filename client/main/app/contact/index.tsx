import { useRouter } from 'expo-router';

import { ContactPage } from '@features/landing';
import { ROUTES } from '@/utils/route';

export default function ContactScreen() {
  const router = useRouter();

  return (
    <ContactPage onBackPress={() => router.replace(ROUTES.landing as never)} />
  );
}
