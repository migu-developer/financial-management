import { Redirect } from 'expo-router';

import { ROUTES } from '@/utils/route';

export default function DashboardIndex() {
  return <Redirect href={ROUTES.dashboardHome as never} />;
}
