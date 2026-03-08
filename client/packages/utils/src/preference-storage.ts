import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  THEME: 'pref:theme',
  LANGUAGE: 'pref:language',
} as const;

export const preferenceStorage = {
  getTheme: () => AsyncStorage.getItem(KEYS.THEME),
  setTheme: (v: string) => AsyncStorage.setItem(KEYS.THEME, v),
  getLanguage: () => AsyncStorage.getItem(KEYS.LANGUAGE),
  setLanguage: (v: string) => AsyncStorage.setItem(KEYS.LANGUAGE, v),
};
