import React from 'react';
import { View } from 'react-native';

/**
 * Mobile dashboard layout placeholder.
 * Will be implemented with a bottom tab navigator and mobile-specific UX.
 */
interface DashboardMobileLayoutProps {
  children: React.ReactNode;
}

export function DashboardMobileLayout({
  children,
}: DashboardMobileLayoutProps) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
