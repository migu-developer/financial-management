import React, { useState } from 'react';
import { View } from 'react-native';

import { WebHeader } from '@features/dashboard/presentation/components/web/organisms/web-header';
import { WebSidebar } from '@features/dashboard/presentation/components/web/organisms/web-sidebar';

interface DashboardWebLayoutProps {
  children: React.ReactNode;
}

export function DashboardWebLayout({ children }: DashboardWebLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {/* Header — always on top (zIndex 100 applied inside WebHeader) */}
      <WebHeader onMenuPress={() => setSidebarOpen(true)} />

      {/* Content area: pages + sidebar overlay */}
      <View style={{ flex: 1, position: 'relative' as const }}>
        {children}
        <WebSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </View>
    </View>
  );
}
