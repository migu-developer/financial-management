import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { useColorScheme } from 'nativewind';

import { i18n } from '@packages/i18n';
import { preferenceStorage } from '@packages/utils';
import { ColorScheme, ThemeContext, type Theme } from '@features/ui';

interface PreferencesProviderProps {
  children: React.ReactNode;
  onReady?: () => void;
}

export function PreferencesProvider({
  children,
  onReady,
}: PreferencesProviderProps) {
  const { setColorScheme: nwSetColorScheme } = useColorScheme();

  // Local source of truth for the scheme the user actively chose.
  // We own this; we never read colorScheme back from NativeWind to avoid
  // the stale-hook issue where PreferencesProvider doesn't re-render on toggle.
  const [managedScheme, setManagedScheme] = useState<Theme>(() => {
    return (Appearance.getColorScheme() ?? ColorScheme.LIGHT) as Theme;
  });

  // Restore preferences on first mount
  useEffect(() => {
    async function restore() {
      const [storedTheme, storedLang] = await Promise.all([
        preferenceStorage.getTheme(),
        preferenceStorage.getLanguage(),
      ]);

      if (
        storedTheme &&
        (storedTheme === ColorScheme.LIGHT || storedTheme === ColorScheme.DARK)
      ) {
        setManagedScheme(storedTheme);
        nwSetColorScheme(storedTheme);
      } else {
        // No stored preference → follow the OS
        nwSetColorScheme(ColorScheme.SYSTEM);
        setManagedScheme(
          (Appearance.getColorScheme() ?? ColorScheme.LIGHT) as Theme,
        );
      }

      if (storedLang) await i18n.changeLanguage(storedLang);

      onReady?.();
    }
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist language changes (i18next event — works reliably on all platforms)
  useEffect(() => {
    const persist = (lang: string) => preferenceStorage.setLanguage(lang);
    i18n.on('languageChanged', persist);
    return () => {
      i18n.off('languageChanged', persist);
    };
  }, []);

  const setColorScheme = useCallback(
    (scheme: Theme) => {
      nwSetColorScheme(scheme);
      if (scheme === ColorScheme.SYSTEM) {
        const osScheme = (Appearance.getColorScheme() ??
          ColorScheme.LIGHT) as Theme;
        setManagedScheme(osScheme);
        // Don't persist 'system' — next launch will default back to system
        preferenceStorage.setTheme(ColorScheme.SYSTEM);
      } else {
        setManagedScheme(scheme);
        preferenceStorage.setTheme(scheme);
      }
    },
    [nwSetColorScheme],
  );

  const toggleColorScheme = useCallback(() => {
    setColorScheme(
      managedScheme === ColorScheme.DARK ? ColorScheme.LIGHT : ColorScheme.DARK,
    );
  }, [managedScheme, setColorScheme]);

  const themeActions = useMemo(
    () => ({ colorScheme: managedScheme, toggleColorScheme, setColorScheme }),
    [managedScheme, toggleColorScheme, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={themeActions}>
      {children}
    </ThemeContext.Provider>
  );
}
