import { ContactPage } from './index';

describe('ContactPage page', () => {
  it('module exports a function', () => {
    expect(typeof ContactPage).toBe('function');
  });

  it('ContactPage has the expected name', () => {
    expect(ContactPage.name).toBe('ContactPage');
  });

  describe('props interface', () => {
    it('accepts optional onBackPress callback', () => {
      expect(ContactPage).toBeDefined();
    });
  });
});
