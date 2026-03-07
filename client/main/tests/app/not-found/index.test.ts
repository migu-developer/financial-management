import mod from '@/app/+not-found';
import { NotFoundPage, NotFoundTemplate } from '@features/landing';
import { ROUTES } from '@/utils/route';

describe('NotFound screen (app/+not-found)', () => {
  it('module exports a default function', () => {
    expect(typeof mod).toBe('function');
  });

  it('NotFound has the expected name', () => {
    expect(mod.name).toBe('NotFound');
  });

  describe('not-found feature integration', () => {
    it('NotFoundPage is exported from @features/landing', () => {
      expect(typeof NotFoundPage).toBe('function');
    });

    it('NotFoundTemplate is exported from @features/landing', () => {
      expect(typeof NotFoundTemplate).toBe('function');
    });
  });

  describe('navigation', () => {
    it('ROUTES.landing exists for post-404 redirect', () => {
      expect(typeof ROUTES.landing).toBe('string');
    });
  });
});
