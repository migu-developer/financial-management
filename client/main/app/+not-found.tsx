import { useRouter } from 'expo-router';

import { NotFoundPage } from '@features/landing';
import { ROUTES } from '@/utils/route';

export default function NotFound() {
  const router = useRouter();

  return (
    <NotFoundPage
      onGoHomePress={() => router.replace(ROUTES.landing as never)}
    />
  );
}
