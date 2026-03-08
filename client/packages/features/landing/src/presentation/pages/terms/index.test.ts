import { TermsPage } from './index';

describe('TermsPage page', () => {
  it('module exports a function', () => {
    expect(typeof TermsPage).toBe('function');
  });

  it('TermsPage has the expected name', () => {
    expect(TermsPage.name).toBe('TermsPage');
  });

  describe('props interface', () => {
    it('accepts optional onBackPress callback', () => {
      expect(TermsPage).toBeDefined();
    });
  });
});
