export const ui = {
  hidePassword: 'Ocultar contraseña',
  showPassword: 'Mostrar contraseña',
  themeToggle: {
    switchToLight: 'Cambiar a modo claro',
    switchToDark: 'Cambiar a modo oscuro',
  },
  languageSelector: {
    label: 'Seleccionar idioma',
    languages: {
      en: 'Inglés',
      es: 'Español',
    },
  },
} as const;

export type UiTranslation = typeof ui;
