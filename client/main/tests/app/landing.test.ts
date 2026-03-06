describe('LandingScreen screen (app/landing)', () => {
  it('module exports a default function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/app/landing');
    expect(typeof mod.default).toBe('function');
  });

  it('LandingScreen has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: LandingScreen } = require('@/app/landing');
    expect(LandingScreen.name).toBe('LandingScreen');
  });

  describe('landing feature integration', () => {
    it('LandingPage is exported from @features/landing', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LandingPage } = require('@features/landing');
      expect(typeof LandingPage).toBe('function');
    });

    it('LandingTemplate is exported from @features/landing', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LandingTemplate } = require('@features/landing');
      expect(typeof LandingTemplate).toBe('function');
    });
  });

  describe('navigation', () => {
    it('ROUTES.auth is defined for post-landing navigation', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ROUTES } = require('@/utils/route');
      expect(typeof ROUTES.auth).toBe('string');
    });
  });
});
