describe('NotFound screen (app/+not-found)', () => {
  it('module exports a default function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/app/+not-found');
    expect(typeof mod.default).toBe('function');
  });

  it('NotFound has the expected name', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: NotFound } = require('@/app/+not-found');
    expect(NotFound.name).toBe('NotFound');
  });

  describe('not-found feature integration', () => {
    it('NotFoundPage is exported from @features/landing', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NotFoundPage } = require('@features/landing');
      expect(typeof NotFoundPage).toBe('function');
    });

    it('NotFoundTemplate is exported from @features/landing', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NotFoundTemplate } = require('@features/landing');
      expect(typeof NotFoundTemplate).toBe('function');
    });
  });

  describe('navigation', () => {
    it('ROUTES.landing exists for post-404 redirect', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ROUTES } = require('@/utils/route');
      expect(typeof ROUTES.landing).toBe('string');
    });
  });
});
