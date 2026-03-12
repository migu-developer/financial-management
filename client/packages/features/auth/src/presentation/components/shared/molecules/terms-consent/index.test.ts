import { TermsConsent } from './index';

describe('TermsConsent', () => {
  it('exports a function', () => {
    expect(typeof TermsConsent).toBe('function');
  });

  it('has the expected name', () => {
    expect(TermsConsent.name).toBe('TermsConsent');
  });
});
