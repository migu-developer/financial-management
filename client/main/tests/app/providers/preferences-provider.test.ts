import { PreferencesProvider } from '@/app/providers/preferences-provider';

describe('PreferencesProvider (app/providers/preferences-provider)', () => {
  it('exports PreferencesProvider as a function', () => {
    expect(typeof PreferencesProvider).toBe('function');
  });

  it('PreferencesProvider has the expected name', () => {
    expect(PreferencesProvider.name).toBe('PreferencesProvider');
  });
});
