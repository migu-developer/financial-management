import { ROUTES } from './router';

describe('ROUTES', () => {
  it('contains /users route', () => {
    expect(ROUTES.find((r) => r.url === '/users')).toBeDefined();
  });

  it('contains /users/{id} route', () => {
    expect(ROUTES.find((r) => r.url === '/users/{id}')).toBeDefined();
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
