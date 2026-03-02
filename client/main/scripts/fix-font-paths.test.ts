import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runFixFontPaths } from './fix-font-paths';

describe('fix-font-paths', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-font-paths-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits without error when dist path does not exist', () => {
    const missing = path.join(tmpDir, 'missing');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    expect(() => runFixFontPaths(missing)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      'fix-font-paths: dist path does not exist:',
      missing,
    );
    warnSpy.mockRestore();
  });

  it('creates dist/fonts and copies .ttf from assets/__node_modules and replaces paths in .js', () => {
    const fontsSourceDir = path.join(
      tmpDir,
      'assets',
      '__node_modules',
      'some-pkg',
      'Fonts',
    );
    fs.mkdirSync(fontsSourceDir, { recursive: true });
    const ttfPath = path.join(fontsSourceDir, 'MaterialIcons.abc123.ttf');
    fs.writeFileSync(ttfPath, 'fake-ttf-content');

    const jsDir = path.join(tmpDir, '_expo', 'static', 'js', 'web');
    fs.mkdirSync(jsDir, { recursive: true });
    const jsPath = path.join(jsDir, 'entry.js');
    const oldPath =
      '/assets/__node_modules/.pnpm/some@1.0.0/node_modules/some-pkg/Fonts/MaterialIcons.abc123.ttf';
    fs.writeFileSync(jsPath, `const font = "${oldPath}";`, 'utf8');

    runFixFontPaths(tmpDir);

    const fontsDir = path.join(tmpDir, 'fonts');
    expect(fs.existsSync(fontsDir)).toBe(true);
    const copiedTtf = path.join(fontsDir, 'MaterialIcons.abc123.ttf');
    expect(fs.existsSync(copiedTtf)).toBe(true);
    expect(fs.readFileSync(copiedTtf, 'utf8')).toBe('fake-ttf-content');

    const jsContent = fs.readFileSync(jsPath, 'utf8');
    expect(jsContent).toContain('/fonts/MaterialIcons.abc123.ttf');
    expect(jsContent).not.toContain('__node_modules');
  });

  it('does not modify .js files that do not contain __node_modules', () => {
    const jsDir = path.join(tmpDir, 'other');
    fs.mkdirSync(jsDir, { recursive: true });
    const jsPath = path.join(jsDir, 'plain.js');
    const original = 'const x = "/other/path";';
    fs.writeFileSync(jsPath, original, 'utf8');

    runFixFontPaths(tmpDir);

    expect(fs.readFileSync(jsPath, 'utf8')).toBe(original);
  });
});
