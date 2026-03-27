import { ROUTES } from './router';

describe('ROUTES', () => {
  it('contains /expenses route', () => {
    expect(ROUTES.find((r) => r.url === '/expenses')).toBeDefined();
  });

  it('contains /expenses/{id} route', () => {
    expect(ROUTES.find((r) => r.url === '/expenses/{id}')).toBeDefined();
  });

  it('has exactly 2 routes', () => {
    expect(ROUTES).toHaveLength(2);
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
