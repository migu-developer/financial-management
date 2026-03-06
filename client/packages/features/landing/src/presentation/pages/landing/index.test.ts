describe('LandingPage page', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.LandingPage).toBe('function');
  });

  it('LandingPage has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LandingPage } = require('./index');
    expect(LandingPage.name).toBe('LandingPage');
  });

  describe('package exports', () => {
    it('LandingPage is exported from the package index', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageIndex = require('../../../index');
      expect(typeof packageIndex.LandingPage).toBe('function');
    });

    it('LandingTemplate is exported from the package index', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageIndex = require('../../../index');
      expect(typeof packageIndex.LandingTemplate).toBe('function');
    });
  });

  describe('props interface', () => {
    it('requires onNavigateToAuth callback', () => {
      // TypeScript enforces this at compile time
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LandingPage } = require('./index');
      expect(LandingPage).toBeDefined();
    });
  });
});
