jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { preferenceStorage } from './preference-storage';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('preferenceStorage.getTheme', () => {
  it('calls AsyncStorage.getItem with the theme key', async () => {
    mockGetItem.mockResolvedValue('dark');
    const result = await preferenceStorage.getTheme();
    expect(mockGetItem).toHaveBeenCalledWith('pref:theme');
    expect(result).toBe('dark');
  });

  it('returns null when no theme is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await preferenceStorage.getTheme();
    expect(result).toBeNull();
  });
});

describe('preferenceStorage.setTheme', () => {
  it('calls AsyncStorage.setItem with the theme key and value', async () => {
    await preferenceStorage.setTheme('light');
    expect(mockSetItem).toHaveBeenCalledWith('pref:theme', 'light');
  });
});

describe('preferenceStorage.getLanguage', () => {
  it('calls AsyncStorage.getItem with the language key', async () => {
    mockGetItem.mockResolvedValue('es');
    const result = await preferenceStorage.getLanguage();
    expect(mockGetItem).toHaveBeenCalledWith('pref:language');
    expect(result).toBe('es');
  });

  it('returns null when no language is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await preferenceStorage.getLanguage();
    expect(result).toBeNull();
  });
});

describe('preferenceStorage.setLanguage', () => {
  it('calls AsyncStorage.setItem with the language key and value', async () => {
    await preferenceStorage.setLanguage('es');
    expect(mockSetItem).toHaveBeenCalledWith('pref:language', 'es');
  });
});
