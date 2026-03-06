export const ui = {
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
