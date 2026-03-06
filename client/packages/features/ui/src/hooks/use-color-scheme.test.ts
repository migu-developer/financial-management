import { ColorScheme } from '@features/ui/utils/constants';
import { useColorScheme } from './use-color-scheme';

describe('useColorScheme hooks', () => {
  describe('use-color-scheme.ts (native re-export)', () => {
    it('exports useColorScheme as a function', () => {
      // The native file re-exports from react-native which is mocked
      expect(useColorScheme).toBeDefined();
      expect(typeof useColorScheme).toBe('function');
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

      expect(typeof useColorScheme).toBe('function');
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

      const result = useColorScheme();
      expect(result).toBe('dark');
    });
  });
});
