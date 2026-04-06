export const dashboard = {
  home: {
    title: 'Financial Dashboard',
    underDevelopment: 'Under Development',
    description:
      'We are building your financial dashboard. Stay tuned for real-time analytics, expense tracking, and more.',
  },
  sidebar: {
    appName: 'FinanceApp',
    expenses: 'Expenses',
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
  expenses: {
    title: 'Expenses',
    newExpense: '+ New expense',
    editExpense: 'Edit expense',
    createExpense: 'New expense',
    deleteExpense: 'Delete expense',
    deleteConfirmMessage: 'Are you sure you want to delete "{{name}}"?',
    emptyTitle: 'No expenses yet',
    emptyDescription:
      'Create your first expense to start tracking your finances',
    totalExpenses: '{{count}} expenses',
    save: 'Save',
    create: 'Create',
    update: 'Update',
    cancel: 'Cancel',
    delete: 'Delete',
    loadMore: 'Load more',
    errorTitle: 'Something went wrong',
    retry: 'Retry',
    form: {
      name: 'Name',
      namePlaceholder: 'Expense name',
      value: 'Value',
      valuePlaceholder: '0.00',
      type: 'Type',
      typePlaceholder: 'Select type',
      currency: 'Currency',
      currencyPlaceholder: 'Select currency',
      category: 'Category (optional)',
      categoryPlaceholder: 'Select category',
      categoryNone: 'None',
    },
    card: {
      deleteAccessibility: 'Delete expense',
      accessibilityLabel: '{{name}}, {{amount}}',
    },
    selector: {
      selectTitle: 'Select {{field}}',
      done: 'Done',
    },
    errors: {
      loadExpenses: 'Failed to load expenses',
      loadMore: 'Failed to load more expenses',
      loadCatalogs: 'Failed to load catalogs',
      authExpired: 'Authentication token expired or missing',
    },
    modal: {
      closeAccessibility: 'Close dialog',
    },
  },
} as const;

export type DashboardTranslation = typeof dashboard;
