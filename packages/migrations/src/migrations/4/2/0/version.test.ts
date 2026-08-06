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

describe('migration v4.2.0', () => {
  it('has a description', () => {
    expect(versionConfig.description).toBeTruthy();
    expect(typeof versionConfig.description).toBe('string');
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

  it('up adds a nullable jsonb column', () => {
    const sql = readScript('up');
    expect(sql).toContain('ADD COLUMN attachment_extraction jsonb');
    // Nullable on purpose: every existing row, and every text-only message,
    // has no extraction. A NOT NULL would fail on the existing table.
    expect(sql).not.toMatch(/attachment_extraction jsonb[^;]*NOT NULL/);
  });

  it('up refuses an extraction on a message with no attachment', () => {
    const sql = readScript('up');
    expect(sql).toContain('chk_chat_messages_extraction_needs_attachment');
    expect(sql).toContain('attachment_s3_key IS NOT NULL');
  });

  it('up indexes the lookup the follow-up turn performs', () => {
    const sql = readScript('up');
    // "latest message in this session that has an extraction"
    expect(sql).toContain('idx_chat_messages_session_extraction');
    expect(sql).toContain('session_id, created_at DESC');
    // Partial: nearly every row is NULL here, so a full index would be waste.
    expect(sql).toContain('WHERE attachment_extraction IS NOT NULL');
  });

  it('down removes the index and constraint before the column', () => {
    const sql = readScript('down');
    const idx = sql.indexOf('DROP INDEX');
    const constraint = sql.indexOf('DROP CONSTRAINT');
    const column = sql.indexOf('DROP COLUMN');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(constraint).toBeGreaterThanOrEqual(0);
    expect(column).toBeGreaterThan(constraint);
  });

  it('down is idempotent', () => {
    const sql = readScript('down');
    // A rollback re-run must not fail on an already-dropped object.
    expect(sql).toContain('DROP INDEX IF EXISTS');
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS');
    expect(sql).toContain('DROP COLUMN IF EXISTS');
  });
});
