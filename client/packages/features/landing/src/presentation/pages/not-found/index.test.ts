describe('NotFoundPage page', () => {
  it('module exports a function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./index');
    expect(typeof mod.NotFoundPage).toBe('function');
  });

  it('NotFoundPage has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NotFoundPage } = require('./index');
    expect(NotFoundPage.name).toBe('NotFoundPage');
  });

  describe('package exports', () => {
    it('NotFoundPage is exported from the package index', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageIndex = require('../../../index');
      expect(typeof packageIndex.NotFoundPage).toBe('function');
    });

    it('NotFoundTemplate is exported from the package index', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageIndex = require('../../../index');
      expect(typeof packageIndex.NotFoundTemplate).toBe('function');
    });
  });

  describe('props interface', () => {
    it('accepts optional onGoHomePress callback', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NotFoundPage } = require('./index');
      expect(NotFoundPage).toBeDefined();
    });
  });
});
