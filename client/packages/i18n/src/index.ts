export { default as i18n, resources } from './config';
export type { AppResources, SupportedLanguage, Namespace } from './config';
export { useTranslation } from 'react-i18next';

/**
 * Types translations
 */
export type { LoginTranslation as LoginTranslationEn } from './locales/en/login';
export type { LoginTranslation as LoginTranslationEs } from './locales/es/login';
export type { LandingTranslation as LandingTranslationEn } from './locales/en/landing';
export type { LandingTranslation as LandingTranslationEs } from './locales/es/landing';
