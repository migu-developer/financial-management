import { landing } from './index';
import type { LandingTranslation } from './index';

describe('en/landing namespace', () => {
  it('exports landing as an object', () => {
    expect(landing).toBeDefined();
    expect(typeof landing).toBe('object');
  });

  it('has all expected sections', () => {
    expect(landing).toHaveProperty('header');
    expect(landing).toHaveProperty('hero');
    expect(landing).toHaveProperty('features');
    expect(landing).toHaveProperty('howItWorks');
    expect(landing).toHaveProperty('cta');
    expect(landing).toHaveProperty('footer');
  });

  it('header has logo, nav and a11y keys', () => {
    expect(landing.header.logo).toBe('Financial Management');
    expect(landing.header.nav).toHaveProperty('features');
    expect(landing.header.nav).toHaveProperty('howItWorks');
    expect(landing.header.a11y).toHaveProperty('nav');
    expect(landing.header.a11y).toHaveProperty('cta');
  });

  it('features section has 4 items', () => {
    const keys = Object.keys(landing.features.items);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('expenses');
    expect(keys).toContain('analytics');
    expect(keys).toContain('multiCurrency');
    expect(keys).toContain('security');
  });

  it('howItWorks has 3 steps', () => {
    const keys = Object.keys(landing.howItWorks.steps);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('create');
    expect(keys).toContain('connect');
    expect(keys).toContain('analyze');
  });

  it('footer copyright contains interpolation placeholder', () => {
    expect(landing.footer.copyright).toContain('{{year}}');
  });

  it('satisfies the LandingTranslation type', () => {
    const _typeCheck: LandingTranslation = landing;
    expect(_typeCheck).toBe(landing);
  });
});
