import { ColorScheme } from '@features/ui/utils/constants';

describe('use-color-scheme.web.ts', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('exports useColorScheme as a function', async () => {
    jest.doMock('react', () => ({
      useState: (init: unknown) => [init, jest.fn()],
      useEffect: jest.fn(),
    }));
    jest.doMock('react-native', () => ({
      useColorScheme: jest.fn(() => 'dark'),
    }));

    const { useColorScheme } = await import('./use-color-scheme.web');
    expect(typeof useColorScheme).toBe('function');
  });

  it('returns LIGHT scheme before hydration (SSR safety)', async () => {
    jest.doMock('react', () => ({
      // useState returns [false, setter] — simulates pre-hydration state
      useState: () => [false, jest.fn()],
      useEffect: jest.fn(),
    }));
    jest.doMock('react-native', () => ({
      useColorScheme: jest.fn(() => 'dark'),
    }));

    const { useColorScheme } = await import('./use-color-scheme.web');
    const result = useColorScheme();
    expect(result).toBe(ColorScheme.LIGHT);
  });

  it('returns the actual colorScheme after hydration', async () => {
    jest.doMock('react', () => ({
      // useState returns [true, setter] — simulates post-hydration state
      useState: () => [true, jest.fn()],
      useEffect: jest.fn(),
    }));
    jest.doMock('react-native', () => ({
      useColorScheme: jest.fn(() => 'dark'),
    }));

    const { useColorScheme } = await import('./use-color-scheme.web');
    const result = useColorScheme();
    expect(result).toBe('dark');
  });
});
