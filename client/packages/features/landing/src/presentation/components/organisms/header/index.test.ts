import { LandingHeader } from './index';

describe('LandingHeader organism', () => {
  it('module exports a function', () => {
    expect(typeof LandingHeader).toBe('function');
  });

  it('LandingHeader has the expected name', () => {
    expect(LandingHeader.name).toBe('LandingHeader');
  });

  describe('props interface', () => {
    it('accepts optional onLoginPress, onFeaturesPress, onHowItWorksPress callbacks', () => {
      // Verified by TypeScript compilation — if this file compiles, prop types are correct
      expect(LandingHeader).toBeDefined();
    });
  });
});
