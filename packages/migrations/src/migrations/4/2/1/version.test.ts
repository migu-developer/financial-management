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

describe('migration v4.2.1', () => {
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

  it('up matches every clause of findLatestUnusedExtraction', () => {
    const sql = readScript('up');
    // The query filters on both columns and orders by created_at then id, so all
    // four pieces have to be in the index for it to be satisfied without a heap
    // recheck or an extra sort.
    expect(sql).toContain('(session_id, created_at DESC, id DESC)');
    expect(sql).toContain('WHERE attachment_extraction IS NOT NULL');
    expect(sql).toContain('expense_id IS NULL');
  });

  it('up drops the old index first (same name, different definition)', () => {
    const sql = readScript('up');
    const drop = sql.indexOf('DROP INDEX');
    const create = sql.indexOf('CREATE INDEX');
    expect(drop).toBeGreaterThanOrEqual(0);
    expect(create).toBeGreaterThan(drop);
  });

  it('down restores the 4.2.0 definition exactly', () => {
    const sql = readScript('down');
    expect(sql).toContain('(session_id, created_at DESC)');
    // The 4.2.0 predicate had no expense_id clause.
    expect(sql).not.toContain('expense_id');
  });

  it('does NOT edit the already-applied 4.2.0 migration', () => {
    // 4.2.0 is applied to both databases; rewriting its SQL would leave the
    // recorded checksum disagreeing with the file on disk.
    const v420 = fs.readFileSync(
      path.join(migrationDir, '..', '0', '1_up_add_attachment_extraction.sql'),
      'utf-8',
    );
    expect(v420).toContain('(session_id, created_at DESC)');
    expect(v420).not.toContain('id DESC)');
  });
});
