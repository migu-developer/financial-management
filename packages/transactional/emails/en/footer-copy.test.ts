import { footerCopy } from './footer-copy';

describe('emails/en/footer-copy', () => {
  it('exports footer copy with required keys', () => {
    expect(footerCopy).toHaveProperty('help');
    expect(footerCopy).toHaveProperty('legal');
    expect(footerCopy).toHaveProperty('rights');
    expect(footerCopy).toHaveProperty('privacy');
  });

  it('has non-empty English strings', () => {
    expect(typeof footerCopy.help).toBe('string');
    expect(footerCopy.help.length).toBeGreaterThan(0);
    expect(footerCopy.legal).toContain('Financial Management');
    expect(footerCopy.privacy).toContain('privacy');
  });
});
