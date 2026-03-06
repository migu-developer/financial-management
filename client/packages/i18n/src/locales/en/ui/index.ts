export const ui = {
  themeToggle: {
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
  },
} as const;

export type UiTranslation = typeof ui;
