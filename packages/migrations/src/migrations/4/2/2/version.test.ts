import fs from 'node:fs';
import path from 'node:path';
import versionConfig from './version';

const migrationDir = __dirname;

const readScript = (which: 'up' | 'down'): string => {
  const script = versionConfig.scripts[0]!;
  if (script.type !== 'sql') throw new Error('expected a sql script');
  return fs.readFileSync(
    path.join(migrationDir, `${script[which]}.sql`),
    'utf-8',
  );
};

describe('migration v4.2.2', () => {
  it('has a description', () => {
    expect(versionConfig.description).toBeTruthy();
  });

  it('declares one script', () => {
    expect(versionConfig.scripts).toHaveLength(1);
  });

  it('all sql scripts reference existing files', () => {
    for (const script of versionConfig.scripts) {
      if (script.type === 'sql' || script.type === 'seed') {
        expect(fs.existsSync(path.join(migrationDir, `${script.up}.sql`))).toBe(
          true,
        );
        expect(
          fs.existsSync(path.join(migrationDir, `${script.down}.sql`)),
        ).toBe(true);
      }
    }
  });

  it('adds hidden_from_context defaulting to false', () => {
    const sql = readScript('up');
    // NOT NULL with a default so every existing row — and every ordinary
    // message — stays visible to the model without a backfill.
    expect(sql).toContain('ADD COLUMN hidden_from_context boolean');
    expect(sql).toContain('DEFAULT false');
    expect(sql).toContain('NOT NULL');
  });

  it('widens the extraction index back so used rows are visible', () => {
    const sql = readScript('up');
    // The corrected lookup inspects the newest extraction REGARDLESS of
    // expense_id, so a predicate excluding used rows would make the index
    // unusable for it.
    expect(sql).toContain(
      'ON financial_management.chat_messages (session_id, created_at DESC, id DESC)',
    );
    expect(sql).toContain('WHERE attachment_extraction IS NOT NULL');
    // The 4.2.1 clause is gone from the CREATE.
    const create = sql.slice(sql.indexOf('CREATE INDEX'));
    expect(create).not.toContain('expense_id IS NULL');
  });

  it('down restores the 4.2.1 predicate and drops the column', () => {
    const sql = readScript('down');
    expect(sql).toContain(
      'WHERE attachment_extraction IS NOT NULL AND expense_id IS NULL',
    );
    expect(sql).toContain('DROP COLUMN IF EXISTS hidden_from_context');
  });

  it('drops the index before recreating it under the same name', () => {
    for (const which of ['up', 'down'] as const) {
      const sql = readScript(which);
      expect(sql.indexOf('DROP INDEX')).toBeLessThan(
        sql.indexOf('CREATE INDEX'),
      );
    }
  });
});
