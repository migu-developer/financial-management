import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';

import { isWeb } from '@packages/utils';
import { ROUTES } from '@/utils/route';

export default function Index() {
  if (isWeb()) {
    return <Redirect href={ROUTES.landing as Href} />;
  }

  return <Redirect href={ROUTES.authLogin as Href} />;
}
