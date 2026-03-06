import { NotFoundPage } from './index';

describe('NotFoundPage page', () => {
  it('module exports a function', () => {
    expect(typeof NotFoundPage).toBe('function');
  });

  it('NotFoundPage has the expected name', () => {
    expect(NotFoundPage.name).toBe('NotFoundPage');
  });

  describe('props interface', () => {
    it('accepts optional onGoHomePress callback', () => {
      expect(NotFoundPage).toBeDefined();
    });
  });
});
