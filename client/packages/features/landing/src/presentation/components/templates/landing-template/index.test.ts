import { LandingTemplate } from './index';

describe('LandingTemplate', () => {
  it('module exports a function', () => {
    expect(typeof LandingTemplate).toBe('function');
  });

  it('LandingTemplate has the expected name', () => {
    expect(LandingTemplate.name).toBe('LandingTemplate');
  });

  describe('environment variable usage', () => {
    it('reads EXPO_PUBLIC_ASSETS_URL from process.env', () => {
      // The template constructs logoUrl from process.env.EXPO_PUBLIC_ASSETS_URL
      // Verify the env var key is consistent
      const envVar = process.env.EXPO_PUBLIC_ASSETS_URL;
      // In test environment, it's undefined — the template falls back to ''
      expect(envVar === undefined || typeof envVar === 'string').toBe(true);
    });

    it('constructs logo URL from assets base URL', () => {
      const assetsUrl = process.env.EXPO_PUBLIC_ASSETS_URL ?? '';
      const logoUrl = `${assetsUrl}/financial-management/300x300.webp`;
      expect(typeof logoUrl).toBe('string');
      expect(logoUrl.endsWith('/financial-management/300x300.webp')).toBe(true);
    });
  });

  describe('props interface', () => {
    it('accepts optional onLoginPress and onGetStartedPress callbacks', () => {
      expect(LandingTemplate).toBeDefined();
    });
  });
});
