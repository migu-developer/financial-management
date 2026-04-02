import React, { useState } from 'react';
import { View } from 'react-native';

import { WebHeader } from '@features/dashboard/presentation/components/web/organisms/web-header';
import { WebSidebar } from '@features/dashboard/presentation/components/web/organisms/web-sidebar';

interface DashboardWebLayoutProps {
  children: React.ReactNode;
  onNavigate?: (route: string) => void;
}

export function DashboardWebLayout({
  children,
  onNavigate,
}: DashboardWebLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <WebHeader onMenuPress={() => setSidebarOpen(true)} />
      <View style={{ flex: 1, position: 'relative' as const }}>
        {children}
        <WebSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNavigate={onNavigate}
        />
      </View>
    </View>
  );
}
