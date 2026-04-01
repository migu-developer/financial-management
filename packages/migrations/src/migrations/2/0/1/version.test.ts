import fs from 'node:fs';
import path from 'node:path';
import versionConfig from './version';

const migrationDir = __dirname;

describe('migration v2.0.1', () => {
  it('has a description', () => {
    expect(versionConfig.description).toBeTruthy();
    expect(typeof versionConfig.description).toBe('string');
  });

  it('declares at least one script', () => {
    expect(versionConfig.scripts.length).toBeGreaterThan(0);
  });

  it('all seed scripts reference existing files', () => {
    for (const script of versionConfig.scripts) {
      if (script.type === 'sql' || script.type === 'seed') {
        const upFile = path.join(migrationDir, `${script.up}.sql`);
        const downFile = path.join(migrationDir, `${script.down}.sql`);
        expect(fs.existsSync(upFile)).toBe(true);
        expect(fs.existsSync(downFile)).toBe(true);
      }
    }
  });

  it('up script seeds all catalog tables', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'seed') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('INSERT INTO currencies');
    expect(sql).toContain('INSERT INTO expenses_types');
    expect(sql).toContain('INSERT INTO expenses_categories');
    expect(sql).toContain('INSERT INTO providers');
    expect(sql).toContain('INSERT INTO documents');
  });

  it('down script deletes all seeded data', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'seed') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.down}.sql`),
      'utf-8',
    );
    expect(sql).toContain('DELETE FROM currencies');
    expect(sql).toContain('DELETE FROM expenses_types');
    expect(sql).toContain('DELETE FROM providers');
    expect(sql).toContain('DELETE FROM documents');
  });
});
