import { createContext, useContext } from 'react';
import type { Theme } from '@features/ui/types/theme';
import { ColorScheme } from '@features/ui/utils/constants';

interface ThemeContextValue {
  colorScheme: Theme;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: ColorScheme.LIGHT,
  toggleColorScheme: () => {},
  setColorScheme: () => {},
});

export const useThemeActions = () => useContext(ThemeContext);
