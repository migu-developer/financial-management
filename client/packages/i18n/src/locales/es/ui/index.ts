export const ui = {
  themeToggle: {
    switchToLight: 'Cambiar a modo claro',
    switchToDark: 'Cambiar a modo oscuro',
  },
} as const;

export type UiTranslation = typeof ui;
