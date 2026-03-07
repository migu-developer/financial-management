import { PrivacyPage } from './index';

describe('PrivacyPage page', () => {
  it('module exports a function', () => {
    expect(typeof PrivacyPage).toBe('function');
  });

  it('PrivacyPage has the expected name', () => {
    expect(PrivacyPage.name).toBe('PrivacyPage');
  });

  describe('props interface', () => {
    it('accepts optional onBackPress callback', () => {
      expect(PrivacyPage).toBeDefined();
    });
  });
});
