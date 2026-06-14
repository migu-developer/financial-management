import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  THEME: 'pref:theme',
  LANGUAGE: 'pref:language',
} as const;

/** Per-user key for the last active chat session (restored on reload). */
const lastChatSessionKey = (userId: string) => `chat:lastSession:${userId}`;

export const preferenceStorage = {
  getTheme: () => AsyncStorage.getItem(KEYS.THEME),
  setTheme: (v: string) => AsyncStorage.setItem(KEYS.THEME, v),
  getLanguage: () => AsyncStorage.getItem(KEYS.LANGUAGE),
  setLanguage: (v: string) => AsyncStorage.setItem(KEYS.LANGUAGE, v),
  getLastChatSession: (userId: string) =>
    AsyncStorage.getItem(lastChatSessionKey(userId)),
  setLastChatSession: (userId: string, sessionId: string) =>
    AsyncStorage.setItem(lastChatSessionKey(userId), sessionId),
  clearLastChatSession: (userId: string) =>
    AsyncStorage.removeItem(lastChatSessionKey(userId)),
};
