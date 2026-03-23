export class SemanticVersion {
  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
  ) {}

  static parse(version: string): SemanticVersion {
    const [major, minor, patch, ...rest] = version.split('.').map(Number);

    if (
      major === undefined ||
      minor === undefined ||
      patch === undefined ||
      rest.length > 0 ||
      !Number.isInteger(major) ||
      !Number.isInteger(minor) ||
      !Number.isInteger(patch) ||
      major < 0 ||
      minor < 0 ||
      patch < 0
    ) {
      throw new Error(`Invalid semantic version: "${version}"`);
    }

    return new SemanticVersion(major, minor, patch);
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
