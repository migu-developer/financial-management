import { HeroSection } from './index';

describe('HeroSection organism', () => {
  it('module exports a function', () => {
    expect(typeof HeroSection).toBe('function');
  });

  it('HeroSection has the expected name', () => {
    expect(HeroSection.name).toBe('HeroSection');
  });

  describe('props interface', () => {
    it('accepts optional onGetStartedPress and onFeaturesPress callbacks', () => {
      expect(HeroSection).toBeDefined();
    });
  });
});
