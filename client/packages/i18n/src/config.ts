import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';
import { es } from './locales/es';

export const resources = {
  en,
  es,
} as const;

export type AppResources = typeof resources;
export type SupportedLanguage = keyof AppResources;
export type Namespace = keyof AppResources[SupportedLanguage];

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  interpolation: {
    escapeValue: false,
  },
  initImmediate: false,
});

export default i18n;
