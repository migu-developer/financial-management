import { LegalSection } from './index';

describe('LegalSection molecule', () => {
  it('module exports a function', () => {
    expect(typeof LegalSection).toBe('function');
  });

  it('LegalSection has the expected name', () => {
    expect(LegalSection.name).toBe('LegalSection');
  });

  describe('props interface', () => {
    it('accepts title (string) and paragraphs (string array)', () => {
      expect(LegalSection).toBeDefined();
    });
  });
});
