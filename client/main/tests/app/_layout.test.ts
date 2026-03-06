import mod from '@/app/_layout';
import { ROUTE_NAMES } from '@/utils/route';
import { isWeb } from '@packages/utils';

describe('RootLayout screen (app/_layout)', () => {
  it('module exports a default function', () => {
    expect(typeof mod).toBe('function');
  });

  it('RootLayout has the expected name', () => {
    expect(mod.name).toBe('RootLayout');
  });

  describe('route names configuration', () => {
    it('ROUTE_NAMES.index is "index"', () => {
      expect(ROUTE_NAMES.index).toBe('index');
    });

    it('ROUTE_NAMES.landing is "landing"', () => {
      expect(ROUTE_NAMES.landing).toBe('landing');
    });
  });

  describe('platform utilities', () => {
    it('isWeb is a function', () => {
      expect(typeof isWeb).toBe('function');
    });

    it('isWeb returns a boolean', () => {
      expect(typeof isWeb()).toBe('boolean');
    });
  });
});
