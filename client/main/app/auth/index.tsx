import { Redirect } from 'expo-router';

import { ROUTES } from '@/utils/route';

export default function AuthIndex() {
  return <Redirect href={ROUTES.authLogin as never} />;
}
