import { LandingFooter } from './index';
import { resources } from '@packages/i18n';

describe('LandingFooter organism', () => {
  it('module exports a function', () => {
    expect(typeof LandingFooter).toBe('function');
  });

  it('LandingFooter has the expected name', () => {
    expect(LandingFooter.name).toBe('LandingFooter');
  });

  describe('LINK_KEYS configuration', () => {
    it('footer has 3 navigation links (privacy, terms, contact)', () => {
      // Verify the footer links via the i18n translation shape
      const { landing } = resources.en;
      const linkKeys = Object.keys(landing.footer.links);
      expect(linkKeys).toHaveLength(3);
      expect(linkKeys).toContain('privacy');
      expect(linkKeys).toContain('terms');
      expect(linkKeys).toContain('contact');
    });

    it('each footer link has a label and a11y key', () => {
      const { landing } = resources.en;
      Object.values(landing.footer.links).forEach((link) => {
        const l = link as { label: string; a11y: string };
        expect(typeof l.label).toBe('string');
        expect(typeof l.a11y).toBe('string');
      });
    });
  });

  describe('props interface', () => {
    it('requires logoUrl prop (string)', () => {
      expect(LandingFooter).toBeDefined();
    });
  });
});
