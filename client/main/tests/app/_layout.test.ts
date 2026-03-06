describe('RootLayout screen (app/_layout)', () => {
  it('module exports a default function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/app/_layout');
    expect(typeof mod.default).toBe('function');
  });

  it('RootLayout has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: RootLayout } = require('@/app/_layout');
    expect(RootLayout.name).toBe('RootLayout');
  });

  describe('route names configuration', () => {
    it('ROUTE_NAMES.index is "index"', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ROUTE_NAMES } = require('@/utils/route');
      expect(ROUTE_NAMES.index).toBe('index');
    });

    it('ROUTE_NAMES.landing is "landing"', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ROUTE_NAMES } = require('@/utils/route');
      expect(ROUTE_NAMES.landing).toBe('landing');
    });
  });

  describe('platform utilities', () => {
    it('isWeb is a function', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { isWeb } = require('@packages/utils');
      expect(typeof isWeb).toBe('function');
    });

    it('isWeb returns a boolean', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { isWeb } = require('@packages/utils');
      expect(typeof isWeb()).toBe('boolean');
    });
  });
});
