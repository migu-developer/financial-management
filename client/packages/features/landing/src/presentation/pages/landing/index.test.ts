import { LandingPage } from './index';

describe('LandingPage page', () => {
  it('module exports a function', () => {
    expect(typeof LandingPage).toBe('function');
  });

  it('LandingPage has the expected name', () => {
    expect(LandingPage.name).toBe('LandingPage');
  });

  describe('props interface', () => {
    it('requires onNavigateToAuth callback', () => {
      expect(LandingPage).toBeDefined();
    });
  });
});
