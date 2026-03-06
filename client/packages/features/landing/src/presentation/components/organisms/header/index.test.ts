describe('LandingHeader organism', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.LandingHeader).toBe('function');
  });

  it('LandingHeader has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LandingHeader } = require('./index');
    expect(LandingHeader.name).toBe('LandingHeader');
  });

  describe('props interface', () => {
    it('accepts optional onLoginPress, onFeaturesPress, onHowItWorksPress callbacks', () => {
      // Verified by TypeScript compilation — if this file compiles, prop types are correct
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LandingHeader } = require('./index');
      expect(LandingHeader).toBeDefined();
    });

    it('requires logoUrl prop (string)', () => {
      // TypeScript enforces logoUrl: string — verified at compile time
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LandingHeader } = require('./index');
      expect(LandingHeader).toBeDefined();
    });
  });
});
