import { useColorScheme } from './use-color-scheme';

describe('use-color-scheme.ts (native re-export)', () => {
  it('exports useColorScheme as a function', () => {
    // The native file re-exports from react-native which is mocked
    expect(useColorScheme).toBeDefined();
    expect(typeof useColorScheme).toBe('function');
  });
});
