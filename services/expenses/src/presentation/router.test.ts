import { ROUTES } from './router';

describe('ROUTES', () => {
  it('contains /expenses route', () => {
    expect(ROUTES.find((r) => r.url === '/expenses')).toBeDefined();
  });

  it('contains /expenses/{id} route', () => {
    expect(ROUTES.find((r) => r.url === '/expenses/{id}')).toBeDefined();
  });

  it('contains /expenses/types route', () => {
    expect(ROUTES.find((r) => r.url === '/expenses/types')).toBeDefined();
  });

  it('contains /expenses/categories route', () => {
    expect(ROUTES.find((r) => r.url === '/expenses/categories')).toBeDefined();
  });

  it('contains /expenses/metrics route', () => {
    expect(ROUTES.find((r) => r.url === '/expenses/metrics')).toBeDefined();
  });

  it('has exactly 5 routes', () => {
    expect(ROUTES).toHaveLength(5);
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
