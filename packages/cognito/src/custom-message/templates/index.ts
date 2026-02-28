import type { LocaleMessages, SupportedLocale } from '@custom-message/types';
import { esMessages } from './es';
import { enMessages } from './en';

export { getEmailHtmlFromS3, getS3Key, TRIGGER_TO_TEMPLATE } from './s3';

const DEFAULT_LOCALE: SupportedLocale = 'en';

const localeRegistry: Record<SupportedLocale, LocaleMessages> = {
  es: esMessages,
  en: enMessages,
};

export function resolveLocale(localeAttr: string | undefined): SupportedLocale {
  if (!localeAttr) return DEFAULT_LOCALE;
  const lang = localeAttr.split(/[-_]/)[0]?.toLowerCase();
  if (lang && lang in localeRegistry) return lang as SupportedLocale;
  return DEFAULT_LOCALE;
}

export function getMessages(locale: SupportedLocale): LocaleMessages {
  return localeRegistry[locale];
}
