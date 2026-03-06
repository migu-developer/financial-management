export const ui = {
  themeToggle: {
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
  },
  languageSelector: {
    label: 'Select language',
  },
} as const;

export type UiTranslation = typeof ui;
