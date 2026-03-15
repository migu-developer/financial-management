export const dashboard = {
  home: {
    title: 'Panel Financiero',
    underDevelopment: 'En Desarrollo',
    description:
      'Estamos construyendo tu panel financiero. Pronto tendrás análisis en tiempo real, seguimiento de gastos y mucho más.',
  },
  sidebar: {
    appName: 'FinanceApp',
    signOut: 'Cerrar sesión',
    closeMenu: 'Cerrar menú de navegación',
  },
  header: {
    menuLabel: 'Abrir menú de navegación',
    userMenuLabel: 'Menú de usuario',
  },
  userMenu: {
    signOut: 'Cerrar sesión',
    closeMenu: 'Cerrar menú de usuario',
  },
  avatar: {
    accessibilityLabel: 'Avatar {{initials}}',
  },
} as const;

export type DashboardTranslation = typeof dashboard;
