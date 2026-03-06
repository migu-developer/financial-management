import { ROUTES } from '@/utils/route';
import { Redirect } from 'expo-router';

export default function Index() {
  // Web: show landing page. Mobile: also landing until auth is implemented.
  return <Redirect href={ROUTES.landing as never} />;
}
