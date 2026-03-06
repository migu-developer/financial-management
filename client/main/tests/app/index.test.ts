describe('Index screen (app/index)', () => {
  it('module exports a default function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/app/index');
    expect(typeof mod.default).toBe('function');
  });

  it('Index has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: Index } = require('@/app/index');
    expect(Index.name).toBe('Index');
  });

  describe('route configuration', () => {
    it('ROUTES.landing is "/landing"', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ROUTES } = require('@/utils/route');
      expect(ROUTES.landing).toBe('/landing');
    });

    it('ROUTES.index is "/"', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ROUTES } = require('@/utils/route');
      expect(ROUTES.index).toBe('/');
    });

    it('ROUTES.auth is defined', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ROUTES } = require('@/utils/route');
      expect(typeof ROUTES.auth).toBe('string');
    });
  });
});
