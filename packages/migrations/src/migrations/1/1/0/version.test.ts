import fs from 'node:fs';
import path from 'node:path';
import versionConfig from './version';

const migrationDir = __dirname;

describe('migration v1.1.0', () => {
  it('has a description', () => {
    expect(versionConfig.description).toBeTruthy();
  });

  it('uses sqlScript type', () => {
    expect(versionConfig.scripts[0]!.type).toBe('sql');
  });

  it('all sql scripts reference existing files', () => {
    for (const script of versionConfig.scripts) {
      if (script.type === 'sql') {
        const upFile = path.join(migrationDir, `${script.up}.sql`);
        const downFile = path.join(migrationDir, `${script.down}.sql`);
        expect(fs.existsSync(upFile)).toBe(true);
        expect(fs.existsSync(downFile)).toBe(true);
      }
    }
  });

  it('up script creates composite indexes for expenses', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('idx_expenses_user_created_at');
    expect(sql).toContain('idx_expenses_user_type_created_at');
    expect(sql).toContain('idx_expenses_user_category');
    expect(sql).toContain('user_id, created_at DESC');
    expect(sql).toContain('user_id, expense_type_id, created_at DESC');
    expect(sql).toContain('user_id, expense_category_id');
  });

  it('down script drops all composite indexes', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.down}.sql`),
      'utf-8',
    );
    expect(sql).toContain('DROP INDEX IF EXISTS idx_expenses_user_category');
    expect(sql).toContain(
      'DROP INDEX IF EXISTS idx_expenses_user_type_created_at',
    );
    expect(sql).toContain('DROP INDEX IF EXISTS idx_expenses_user_created_at');
  });
});
