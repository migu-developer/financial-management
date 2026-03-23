import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getVersionList } from './get-version-list';

function createMigration(
  baseDir: string,
  major: number,
  minor: number,
  patch: number,
  description: string,
): void {
  const dir = path.join(baseDir, String(major), String(minor), String(patch));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'version.ts'),
    `module.exports = { description: '${description}', scripts: [] };`,
  );
}

describe('getVersionList', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no migrations exist', () => {
    expect(getVersionList(tmpDir)).toEqual([]);
  });

  it('returns empty array when directory does not exist', () => {
    expect(getVersionList('/nonexistent/path')).toEqual([]);
  });

  it('discovers a single migration', () => {
    createMigration(tmpDir, 1, 0, 0, 'Initial');
    const versions = getVersionList(tmpDir);
    expect(versions).toHaveLength(1);
    expect(versions[0]!.major).toBe(1);
    expect(versions[0]!.minor).toBe(0);
    expect(versions[0]!.patch).toBe(0);
    expect(versions[0]!.config.description).toBe('Initial');
  });

  it('returns versions sorted ascending', () => {
    createMigration(tmpDir, 1, 1, 0, 'Second');
    createMigration(tmpDir, 1, 0, 0, 'First');
    createMigration(tmpDir, 2, 0, 0, 'Third');

    const versions = getVersionList(tmpDir);
    expect(versions.map((v) => `${v.major}.${v.minor}.${v.patch}`)).toEqual([
      '1.0.0',
      '1.1.0',
      '2.0.0',
    ]);
  });

  it('skips directories without version.ts', () => {
    createMigration(tmpDir, 1, 0, 0, 'Valid');
    // Create a directory without version.ts
    const emptyDir = path.join(tmpDir, '1', '0', '1');
    fs.mkdirSync(emptyDir, { recursive: true });

    const versions = getVersionList(tmpDir);
    expect(versions).toHaveLength(1);
  });

  it('ignores non-numeric directories', () => {
    createMigration(tmpDir, 1, 0, 0, 'Valid');
    // Create a non-numeric directory
    fs.mkdirSync(path.join(tmpDir, 'readme'), { recursive: true });

    const versions = getVersionList(tmpDir);
    expect(versions).toHaveLength(1);
  });
});
