export class SemanticVersion {
  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
  ) {}

  static parse(version: string): SemanticVersion {
    const parts = version.split('.').map(Number);
    if (
      parts.length !== 3 ||
      parts.some((p) => !Number.isInteger(p) || p < 0)
    ) {
      throw new Error(`Invalid semantic version: "${version}"`);
    }
    return new SemanticVersion(parts[0], parts[1], parts[2]);
  }

  static fromPath(
    major: number,
    minor: number,
    patch: number,
  ): SemanticVersion {
    return new SemanticVersion(major, minor, patch);
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  compareTo(other: SemanticVersion): number {
    if (this.major !== other.major) return this.major - other.major;
    if (this.minor !== other.minor) return this.minor - other.minor;
    return this.patch - other.patch;
  }

  equals(other: SemanticVersion): boolean {
    return this.compareTo(other) === 0;
  }

  isGreaterThan(other: SemanticVersion): boolean {
    return this.compareTo(other) > 0;
  }

  isLessThan(other: SemanticVersion): boolean {
    return this.compareTo(other) < 0;
  }

  static sort = {
    ascending: (a: SemanticVersion, b: SemanticVersion): number =>
      a.compareTo(b),
    descending: (a: SemanticVersion, b: SemanticVersion): number =>
      b.compareTo(a),
  };
}
