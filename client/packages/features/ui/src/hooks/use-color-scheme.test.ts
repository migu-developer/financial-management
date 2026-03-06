import { ColorScheme } from '../utils/constants';

describe('useColorScheme hooks', () => {
  describe('use-color-scheme.ts (native re-export)', () => {
    it('exports useColorScheme as a function', () => {
      // The native file re-exports from react-native which is mocked
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./use-color-scheme');
      expect(mod.useColorScheme).toBeDefined();
      expect(typeof mod.useColorScheme).toBe('function');
    });
  });

  describe('use-color-scheme.web.ts (web implementation)', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('exports useColorScheme as a function', () => {
      jest.mock('react', () => ({
        useState: (init: unknown) => [init, jest.fn()],
        useEffect: jest.fn(),
      }));
      jest.mock('react-native', () => ({
        useColorScheme: jest.fn(() => 'dark'),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./use-color-scheme.web');
      expect(typeof mod.useColorScheme).toBe('function');
    });

    it('returns LIGHT scheme before hydration (SSR safety)', () => {
      jest.mock('react', () => ({
        // useState returns [false, setter] — simulates pre-hydration state
        useState: () => [false, jest.fn()],
        useEffect: jest.fn(),
      }));
      jest.mock('react-native', () => ({
        useColorScheme: jest.fn(() => 'dark'),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useColorScheme } = require('./use-color-scheme.web');
      const result = useColorScheme();
      expect(result).toBe(ColorScheme.LIGHT);
    });

    it('would return the actual colorScheme after hydration', () => {
      jest.mock('react', () => ({
        // useState returns [true, setter] — simulates post-hydration state
        useState: () => [true, jest.fn()],
        useEffect: jest.fn(),
      }));
      jest.mock('react-native', () => ({
        useColorScheme: jest.fn(() => 'dark'),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useColorScheme } = require('./use-color-scheme.web');
      const result = useColorScheme();
      expect(result).toBe('dark');
    });
  });
});
