import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';

import { i18n } from '@packages/i18n';
import { preferenceStorage } from '@packages/utils';
import { ColorScheme } from '@features/ui';

interface PreferencesProviderProps {
  children: React.ReactNode;
  onReady?: () => void;
}

type CustomColorScheme =
  | ColorScheme.LIGHT
  | ColorScheme.DARK
  | ColorScheme.SYSTEM;

export function PreferencesProvider({
  children,
  onReady,
}: PreferencesProviderProps) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function restore() {
      const [storedTheme, storedLang] = await Promise.all([
        preferenceStorage.getTheme(),
        preferenceStorage.getLanguage(),
      ]);
      setColorScheme(
        storedTheme ? (storedTheme as CustomColorScheme) : ColorScheme.SYSTEM,
      );
      if (storedLang) await i18n.changeLanguage(storedLang);
      setInitialized(true);
      onReady?.();
    }
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialized && colorScheme) {
      preferenceStorage.setTheme(colorScheme);
    }
  }, [colorScheme, initialized]);

  useEffect(() => {
    const persist = (lang: string) => preferenceStorage.setLanguage(lang);
    i18n.on('languageChanged', persist);
    return () => {
      i18n.off('languageChanged', persist);
    };
  }, []);

  return <>{children}</>;
}
