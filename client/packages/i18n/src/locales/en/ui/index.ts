export const ui = {
  hidePassword: 'Hide password',
  showPassword: 'Show password',
  themeToggle: {
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
  },
  languageSelector: {
    label: 'Select language',
    languages: {
      en: 'English',
      es: 'Spanish',
    },
  },
} as const;

export type UiTranslation = typeof ui;
