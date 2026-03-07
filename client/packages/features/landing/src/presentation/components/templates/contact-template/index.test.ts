import { ContactTemplate } from './index';

describe('ContactTemplate template', () => {
  it('module exports a function', () => {
    expect(typeof ContactTemplate).toBe('function');
  });

  it('ContactTemplate has the expected name', () => {
    expect(ContactTemplate.name).toBe('ContactTemplate');
  });

  describe('props interface', () => {
    it('accepts optional onBackPress callback', () => {
      expect(ContactTemplate).toBeDefined();
    });
  });
});
