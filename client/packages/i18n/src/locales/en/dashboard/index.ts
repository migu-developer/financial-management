export const dashboard = {
  home: {
    title: 'Financial Dashboard',
    underDevelopment: 'Under Development',
    description:
      'We are building your financial dashboard. Stay tuned for real-time analytics, expense tracking, and more.',
  },
} as const;

export type DashboardTranslation = typeof dashboard;
