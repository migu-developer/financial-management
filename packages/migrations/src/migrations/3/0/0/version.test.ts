import fs from 'node:fs';
import path from 'node:path';
import versionConfig from './version';

const migrationDir = __dirname;

describe('migration v3.0.0', () => {
  it('has a description', () => {
    expect(versionConfig.description).toBeTruthy();
    expect(typeof versionConfig.description).toBe('string');
  });

  it('declares two scripts', () => {
    expect(versionConfig.scripts).toHaveLength(2);
  });

  it('all sql scripts reference existing files', () => {
    for (const script of versionConfig.scripts) {
      if (script.type === 'sql' || script.type === 'seed') {
        const upFile = path.join(migrationDir, `${script.up}.sql`);
        const downFile = path.join(migrationDir, `${script.down}.sql`);
        expect(fs.existsSync(upFile)).toBe(true);
        expect(fs.existsSync(downFile)).toBe(true);
      }
    }
  });

  it('script 1: adds date and global_value columns to expenses', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('ADD COLUMN date date');
    expect(sql).toContain('ADD COLUMN global_value numeric(18,8)');
    expect(sql).toContain('idx_expenses_user_date');
  });

  it('script 1 down: removes date and global_value columns', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.down}.sql`),
      'utf-8',
    );
    expect(sql).toContain('DROP COLUMN IF EXISTS global_value');
    expect(sql).toContain('DROP COLUMN IF EXISTS date');
    expect(sql).toContain('DROP INDEX IF EXISTS');
  });

  it('script 2: creates exchange_rates table with unique constraint', () => {
    const script = versionConfig.scripts[1]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('CREATE TABLE financial_management.exchange_rates');
    expect(sql).toContain('rate_to_usd numeric(18,8)');
    expect(sql).toContain('uq_exchange_rates_currency_date');
    expect(sql).toContain('v_latest_exchange_rates');
    expect(sql).toContain('ROW LEVEL SECURITY');
  });

  it('script 2 down: drops exchange_rates table and view', () => {
    const script = versionConfig.scripts[1]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.down}.sql`),
      'utf-8',
    );
    expect(sql).toContain('DROP VIEW IF EXISTS');
    expect(sql).toContain('DROP TABLE IF EXISTS');
  });
});
