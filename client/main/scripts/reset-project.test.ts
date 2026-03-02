import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  oldDirs,
  exampleDir,
  newAppDir,
  indexContent,
  layoutContent,
  moveDirectories,
} from './reset-project';

describe('reset-project', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reset-project-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('constants', () => {
    it('exports expected oldDirs', () => {
      expect(oldDirs).toEqual([
        'app',
        'components',
        'hooks',
        'constants',
        'scripts',
      ]);
    });

    it('exports exampleDir and newAppDir', () => {
      expect(exampleDir).toBe('app-example');
      expect(newAppDir).toBe('app');
    });

    it('indexContent contains Index component and react-native', () => {
      expect(indexContent).toContain('export default function Index()');
      expect(indexContent).toContain('react-native');
    });

    it('layoutContent contains RootLayout and expo-router', () => {
      expect(layoutContent).toContain('export default function RootLayout()');
      expect(layoutContent).toContain('expo-router');
    });
  });

  describe('moveDirectories', () => {
    it('creates new /app with index.tsx and _layout.tsx when no existing dirs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await moveDirectories(tmpDir, 'n');

      const appDir = path.join(tmpDir, newAppDir);
      expect(fs.existsSync(appDir)).toBe(true);
      expect(fs.readFileSync(path.join(appDir, 'index.tsx'), 'utf8')).toBe(
        indexContent,
      );
      expect(fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8')).toBe(
        layoutContent,
      );

      consoleSpy.mockRestore();
    });

    it('moves existing app to app-example when user chooses y', async () => {
      const appPath = path.join(tmpDir, 'app');
      fs.mkdirSync(appPath, { recursive: true });
      fs.writeFileSync(path.join(appPath, 'old.tsx'), 'old');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await moveDirectories(tmpDir, 'y');

      const exampleAppPath = path.join(tmpDir, exampleDir, 'app');
      expect(fs.existsSync(exampleAppPath)).toBe(true);
      expect(
        fs.readFileSync(path.join(exampleAppPath, 'old.tsx'), 'utf8'),
      ).toBe('old');

      const newAppPath = path.join(tmpDir, newAppDir);
      expect(fs.existsSync(path.join(newAppPath, 'index.tsx'))).toBe(true);

      consoleSpy.mockRestore();
    });

    it('deletes existing app and creates fresh one when user chooses n', async () => {
      const appPath = path.join(tmpDir, 'app');
      fs.mkdirSync(appPath, { recursive: true });
      fs.writeFileSync(path.join(appPath, 'old.tsx'), 'old');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await moveDirectories(tmpDir, 'n');

      expect(fs.existsSync(path.join(appPath, 'old.tsx'))).toBe(false);
      expect(fs.existsSync(path.join(appPath, 'index.tsx'))).toBe(true);
      expect(fs.readFileSync(path.join(appPath, 'index.tsx'), 'utf8')).toBe(
        indexContent,
      );

      consoleSpy.mockRestore();
    });
  });
});
