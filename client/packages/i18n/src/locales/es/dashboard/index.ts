export const dashboard = {
  home: {
    title: 'Panel Financiero',
    underDevelopment: 'En Desarrollo',
    description:
      'Estamos construyendo tu panel financiero. Pronto tendrás análisis en tiempo real, seguimiento de gastos y mucho más.',
  },
} as const;

export type DashboardTranslation = typeof dashboard;
