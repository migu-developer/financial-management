import React from 'react';
import { View } from 'react-native';

/**
 * Mobile dashboard layout placeholder.
 * Will be implemented with a bottom tab navigator and mobile-specific UX.
 */
interface DashboardMobileLayoutProps {
  children: React.ReactNode;
  onNavigate?: (route: string) => void;
}

export function DashboardMobileLayout({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onNavigate: _onNavigate,
}: DashboardMobileLayoutProps) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
