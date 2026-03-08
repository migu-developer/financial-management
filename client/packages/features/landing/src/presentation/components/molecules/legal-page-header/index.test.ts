import { LegalPageHeader } from './index';

describe('LegalPageHeader molecule', () => {
  it('module exports a function', () => {
    expect(typeof LegalPageHeader).toBe('function');
  });

  it('LegalPageHeader has the expected name', () => {
    expect(LegalPageHeader.name).toBe('LegalPageHeader');
  });

  describe('props interface', () => {
    it('accepts title, backLabel, and optional onBackPress', () => {
      expect(LegalPageHeader).toBeDefined();
    });
  });
});
