import { createContext, useContext } from 'react';
import type { Theme } from '@features/ui';

interface ThemeContextValue {
  toggleColorScheme: () => void;
  setColorScheme: (scheme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  toggleColorScheme: () => {},
  setColorScheme: () => {},
});

export const useThemeActions = () => useContext(ThemeContext);
