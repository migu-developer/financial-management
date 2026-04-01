import fs from 'node:fs';
import path from 'node:path';
import versionConfig from './version';

const migrationDir = __dirname;

describe('migration v1.0.0', () => {
  it('has a description', () => {
    expect(versionConfig.description).toBeTruthy();
    expect(typeof versionConfig.description).toBe('string');
  });

  it('declares at least one script', () => {
    expect(versionConfig.scripts.length).toBeGreaterThan(0);
  });

  it('all ts scripts reference existing files', () => {
    for (const script of versionConfig.scripts) {
      if (script.type === 'ts') {
        const tsFile = path.join(migrationDir, `${script.path}.ts`);
        expect(fs.existsSync(tsFile)).toBe(true);
      }
    }
  });

  it('ts migration exports up and down functions', async () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'ts') return;
    const mod = await import(path.join(migrationDir, script.path));
    expect(typeof mod.up).toBe('function');
    expect(typeof mod.down).toBe('function');
  });
});
