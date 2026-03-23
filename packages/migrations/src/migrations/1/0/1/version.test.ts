import fs from 'node:fs';
import path from 'node:path';
import versionConfig from './version';

const migrationDir = __dirname;

describe('migration v1.0.1', () => {
  it('has a description', () => {
    expect(versionConfig.description).toBeTruthy();
    expect(typeof versionConfig.description).toBe('string');
  });

  it('uses seedScript type', () => {
    expect(versionConfig.scripts[0]!.type).toBe('seed');
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

  it('up script inserts currencies for supported countries only', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'seed') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('INSERT INTO currencies');
    expect(sql).toContain('COP');
    expect(sql).toContain('MXN');
    expect(sql).toContain('ARS');
    expect(sql).toContain('UYU');
    expect(sql).toContain('EUR');
    // Should NOT contain USD (not a supported country)
    expect(sql).not.toContain("'USD'");
  });

  it('up script inserts expense types as income/outcome', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'seed') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('INSERT INTO expenses_types');
    expect(sql).toContain('income');
    expect(sql).toContain('outcome');
  });

  it('up script inserts expense categories', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'seed') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('INSERT INTO expenses_categories');
    expect(sql).toContain('Food');
    expect(sql).toContain('Transport');
    expect(sql).toContain('Housing');
    expect(sql).toContain('Salary');
    expect(sql).toContain('Investment');
  });

  it('up script inserts providers', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'seed') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('INSERT INTO providers');
    expect(sql).toContain('Google');
    expect(sql).toContain('Facebook');
    expect(sql).toContain('Apple');
    expect(sql).toContain('Microsoft');
  });

  it('up script inserts document types', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'seed') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('INSERT INTO documents');
    expect(sql).toContain('CC');
    expect(sql).toContain('Passport');
    expect(sql).toContain('NIT');
  });

  it('down script deletes all seed data', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'seed') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.down}.sql`),
      'utf-8',
    );
    expect(sql).toContain('DELETE FROM documents');
    expect(sql).toContain('DELETE FROM providers');
    expect(sql).toContain('DELETE FROM expenses_categories');
    expect(sql).toContain('DELETE FROM expenses_types');
    expect(sql).toContain('DELETE FROM currencies');
  });
});
