import { matchRoute } from './router';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

// ─── matchRoute unit tests ────────────────────────────────────────────────────

describe('matchRoute', () => {
  describe('static routes', () => {
    it('matches identical static paths', () => {
      expect(matchRoute('/test', '/test')).toBe(true);
    });

    it('does not match different static paths', () => {
      expect(matchRoute('/test', '/test2')).toBe(false);
    });

    it('does not match when pathname has extra segment', () => {
      expect(matchRoute('/test', '/test/extra')).toBe(false);
    });

    it('does not match when pattern has extra segment', () => {
      expect(matchRoute('/test/extra', '/test')).toBe(false);
    });
  });

  describe('single dynamic segment {id}', () => {
    it('matches a UUID', () => {
      expect(matchRoute('/test/{id}', `/test/${UUID}`)).toBe(true);
    });

    it('matches any non-empty string', () => {
      expect(matchRoute('/test/{id}', '/test/abc')).toBe(true);
    });

    it('does not match when dynamic segment is empty', () => {
      expect(matchRoute('/test/{id}', '/test/')).toBe(false);
    });

    it('does not match when path has no dynamic segment', () => {
      expect(matchRoute('/test/{id}', '/test')).toBe(false);
    });
  });

  describe('multiple dynamic segments', () => {
    it('matches /a/{id}/b/{id} with two UUIDs', () => {
      expect(matchRoute('/a/{id}/b/{id}', `/a/${UUID}/b/${UUID}`)).toBe(true);
    });

    it('matches /name1/{id}/name2/{id}/name3/{id}', () => {
      expect(
        matchRoute(
          '/name1/{id}/name2/{id}/name3/{id}',
          '/name1/x/name2/y/name3/z',
        ),
      ).toBe(true);
    });

    it('does not match when one dynamic segment is empty', () => {
      expect(matchRoute('/a/{id}/b/{id}', `/a/${UUID}/b/`)).toBe(false);
    });

    it('does not match when segment count differs', () => {
      expect(matchRoute('/a/{id}/b/{id}', `/a/${UUID}/b`)).toBe(false);
    });

    it('requires static segments to match exactly', () => {
      expect(matchRoute('/a/{id}/b/{id}', `/a/${UUID}/c/${UUID}`)).toBe(false);
    });
  });

  describe('mixed static and dynamic segments', () => {
    it('matches /test/{id}/details with real value', () => {
      expect(matchRoute('/test/{id}/details', `/test/${UUID}/details`)).toBe(
        true,
      );
    });

    it('does not match when static suffix differs', () => {
      expect(matchRoute('/test/{id}/details', `/test/${UUID}/summary`)).toBe(
        false,
      );
    });
  });
});
