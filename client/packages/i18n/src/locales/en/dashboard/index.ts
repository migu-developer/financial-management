export const dashboard = {
  home: {
    title: 'Financial Dashboard',
    underDevelopment: 'Under Development',
    description:
      'We are building your financial dashboard. Stay tuned for real-time analytics, expense tracking, and more.',
  },
  sidebar: {
    appName: 'FinanceApp',
    signOut: 'Sign out',
    closeMenu: 'Close navigation menu',
  },
  header: {
    menuLabel: 'Open navigation menu',
    userMenuLabel: 'User menu',
  },
  userMenu: {
    signOut: 'Sign out',
    closeMenu: 'Close user menu',
  },
  avatar: {
    accessibilityLabel: 'Avatar {{initials}}',
  },
} as const;

export type DashboardTranslation = typeof dashboard;
