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

  it('up script contains CREATE TABLE statements', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('CREATE TABLE documents');
    expect(sql).toContain('CREATE TABLE providers');
    expect(sql).toContain('CREATE TABLE currencies');
    expect(sql).toContain('CREATE TABLE expenses_types');
    expect(sql).toContain('CREATE TABLE expenses_categories');
    expect(sql).toContain('CREATE TABLE users');
    expect(sql).toContain('CREATE TABLE expenses');
    expect(sql).toContain('CREATE TABLE audit_logs');
  });

  it('up script contains triggers and functions', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_set_updated_at()');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION fn_audit_log()');
    expect(sql).toContain('CREATE TRIGGER trg_users_updated_at');
    expect(sql).toContain('CREATE TRIGGER trg_expenses_updated_at');
    expect(sql).toContain('CREATE TRIGGER trg_users_audit');
    expect(sql).toContain('CREATE TRIGGER trg_expenses_audit');
  });

  it('down script drops all tables, triggers and functions', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.down}.sql`),
      'utf-8',
    );
    expect(sql).toContain('DROP TRIGGER IF EXISTS trg_expenses_audit');
    expect(sql).toContain('DROP TRIGGER IF EXISTS trg_users_audit');
    expect(sql).toContain('DROP FUNCTION IF EXISTS fn_audit_log()');
    expect(sql).toContain('DROP FUNCTION IF EXISTS fn_set_updated_at()');
    expect(sql).toContain('DROP TABLE IF EXISTS audit_logs');
    expect(sql).toContain('DROP TABLE IF EXISTS expenses');
    expect(sql).toContain('DROP TABLE IF EXISTS users');
    expect(sql).toContain('DROP TABLE IF EXISTS expenses_categories');
  });
});
