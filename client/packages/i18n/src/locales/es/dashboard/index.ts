export const dashboard = {
  home: {
    title: 'Panel Financiero',
    underDevelopment: 'En Desarrollo',
    description:
      'Estamos construyendo tu panel financiero. Pronto tendrás análisis en tiempo real, seguimiento de gastos y mucho más.',
  },
  sidebar: {
    appName: 'FinanceApp',
    expenses: 'Gastos',
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
  expenses: {
    title: 'Gastos',
    newExpense: '+ Nuevo gasto',
    editExpense: 'Editar gasto',
    createExpense: 'Nuevo gasto',
    deleteExpense: 'Eliminar gasto',
    deleteConfirmMessage: '¿Estás seguro de que deseas eliminar "{{name}}"?',
    emptyTitle: 'Sin gastos aún',
    emptyDescription:
      'Crea tu primer gasto para empezar a controlar tus finanzas',
    totalExpenses: '{{count}} gastos',
    save: 'Guardar',
    create: 'Crear',
    update: 'Actualizar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    loadMore: 'Cargar más',
    errorTitle: 'Algo salió mal',
    retry: 'Reintentar',
    form: {
      name: 'Nombre',
      namePlaceholder: 'Nombre del gasto',
      value: 'Valor',
      valuePlaceholder: '0.00',
      type: 'Tipo',
      typePlaceholder: 'Seleccionar tipo',
      currency: 'Moneda',
      currencyPlaceholder: 'Seleccionar moneda',
      category: 'Categoría (opcional)',
      categoryPlaceholder: 'Seleccionar categoría',
      categoryNone: 'Ninguna',
    },
    card: {
      deleteAccessibility: 'Eliminar gasto',
    },
    selector: {
      selectTitle: 'Seleccionar {{field}}',
      done: 'Listo',
    },
  },
} as const;

export type DashboardTranslation = typeof dashboard;
