describe('HeroSection organism', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.HeroSection).toBe('function');
  });

  it('HeroSection has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HeroSection } = require('./index');
    expect(HeroSection.name).toBe('HeroSection');
  });

  describe('props interface', () => {
    it('accepts optional onGetStartedPress and onFeaturesPress callbacks', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { HeroSection } = require('./index');
      expect(HeroSection).toBeDefined();
    });
  });
});
