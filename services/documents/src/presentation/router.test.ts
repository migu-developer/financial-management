import { ROUTES } from './router';

describe('ROUTES', () => {
  it('contains /documents route', () => {
    expect(ROUTES.find((r) => r.url === '/documents')).toBeDefined();
  });

  it('has exactly 1 route', () => {
    expect(ROUTES).toHaveLength(1);
  });

  it('each route has a url string', () => {
    for (const route of ROUTES) {
      expect(typeof route.url).toBe('string');
    }
  });

  it('each route has a controller factory function', () => {
    for (const route of ROUTES) {
      expect(typeof route.controller).toBe('function');
    }
  });

  it('route urls are unique', () => {
    const urls = ROUTES.map((r) => r.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
