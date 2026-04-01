import { SemanticVersion } from './semantic-version';

describe('SemanticVersion', () => {
  describe('parse', () => {
    it('parses a valid version string', () => {
      const v = SemanticVersion.parse('1.2.3');
      expect(v.major).toBe(1);
      expect(v.minor).toBe(2);
      expect(v.patch).toBe(3);
    });

    it('parses version 0.0.0', () => {
      const v = SemanticVersion.parse('0.0.0');
      expect(v.major).toBe(0);
    });

    it('throws on invalid format', () => {
      expect(() => SemanticVersion.parse('1.2')).toThrow();
      expect(() => SemanticVersion.parse('abc')).toThrow();
      expect(() => SemanticVersion.parse('1.2.3.4')).toThrow();
      expect(() => SemanticVersion.parse('-1.0.0')).toThrow();
    });
  });

  describe('toString', () => {
    it('returns major.minor.patch', () => {
      expect(SemanticVersion.parse('1.0.0').toString()).toBe('1.0.0');
      expect(SemanticVersion.parse('10.20.30').toString()).toBe('10.20.30');
    });
  });

  describe('compareTo', () => {
    it('major takes priority', () => {
      const a = SemanticVersion.parse('2.0.0');
      const b = SemanticVersion.parse('1.9.9');
      expect(a.compareTo(b)).toBeGreaterThan(0);
    });

    it('minor takes priority over patch', () => {
      const a = SemanticVersion.parse('1.2.0');
      const b = SemanticVersion.parse('1.1.9');
      expect(a.compareTo(b)).toBeGreaterThan(0);
    });

    it('patch comparison', () => {
      const a = SemanticVersion.parse('1.0.1');
      const b = SemanticVersion.parse('1.0.0');
      expect(a.compareTo(b)).toBeGreaterThan(0);
    });

    it('equal versions return 0', () => {
      const a = SemanticVersion.parse('1.2.3');
      const b = SemanticVersion.parse('1.2.3');
      expect(a.compareTo(b)).toBe(0);
    });
  });

  describe('equals / isGreaterThan / isLessThan', () => {
    it('equals returns true for same version', () => {
      const a = SemanticVersion.parse('1.0.0');
      const b = SemanticVersion.parse('1.0.0');
      expect(a.equals(b)).toBe(true);
    });

    it('equals returns false for different versions', () => {
      expect(
        SemanticVersion.parse('1.0.0').equals(SemanticVersion.parse('1.0.1')),
      ).toBe(false);
    });

    it('isGreaterThan works correctly', () => {
      expect(
        SemanticVersion.parse('1.1.0').isGreaterThan(
          SemanticVersion.parse('1.0.0'),
        ),
      ).toBe(true);
      expect(
        SemanticVersion.parse('1.0.0').isGreaterThan(
          SemanticVersion.parse('1.0.0'),
        ),
      ).toBe(false);
    });

    it('isLessThan works correctly', () => {
      expect(
        SemanticVersion.parse('1.0.0').isLessThan(
          SemanticVersion.parse('1.0.1'),
        ),
      ).toBe(true);
      expect(
        SemanticVersion.parse('1.0.1').isLessThan(
          SemanticVersion.parse('1.0.0'),
        ),
      ).toBe(false);
    });
  });

  describe('fromPath', () => {
    it('creates version from numeric components', () => {
      const v = SemanticVersion.fromPath(2, 5, 1);
      expect(v.toString()).toBe('2.5.1');
    });
  });

  describe('sort', () => {
    it('sorts ascending', () => {
      const versions = [
        SemanticVersion.parse('2.0.0'),
        SemanticVersion.parse('1.0.0'),
        SemanticVersion.parse('1.1.0'),
        SemanticVersion.parse('1.0.1'),
      ];
      versions.sort(SemanticVersion.sort.ascending);
      expect(versions.map((v) => v.toString())).toEqual([
        '1.0.0',
        '1.0.1',
        '1.1.0',
        '2.0.0',
      ]);
    });

    it('sorts descending', () => {
      const versions = [
        SemanticVersion.parse('1.0.0'),
        SemanticVersion.parse('2.0.0'),
        SemanticVersion.parse('1.1.0'),
      ];
      versions.sort(SemanticVersion.sort.descending);
      expect(versions.map((v) => v.toString())).toEqual([
        '2.0.0',
        '1.1.0',
        '1.0.0',
      ]);
    });
  });
});
