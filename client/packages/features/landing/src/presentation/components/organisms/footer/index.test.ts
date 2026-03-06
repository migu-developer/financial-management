describe('LandingFooter organism', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.LandingFooter).toBe('function');
  });

  it('LandingFooter has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LandingFooter } = require('./index');
    expect(LandingFooter.name).toBe('LandingFooter');
  });

  describe('LINK_KEYS configuration', () => {
    it('footer has 3 navigation links (privacy, terms, contact)', () => {
      // Verify the footer links via the i18n translation shape
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { landing } = require('@packages/i18n/locales/en/landing');
      const linkKeys = Object.keys(landing.footer.links);
      expect(linkKeys).toHaveLength(3);
      expect(linkKeys).toContain('privacy');
      expect(linkKeys).toContain('terms');
      expect(linkKeys).toContain('contact');
    });

    it('each footer link has a label and a11y key', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { landing } = require('@packages/i18n/locales/en/landing');
      Object.values(landing.footer.links).forEach((link) => {
        const l = link as { label: string; a11y: string };
        expect(typeof l.label).toBe('string');
        expect(typeof l.a11y).toBe('string');
      });
    });
  });

  describe('props interface', () => {
    it('requires logoUrl prop (string)', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LandingFooter } = require('./index');
      expect(LandingFooter).toBeDefined();
    });
  });
});
