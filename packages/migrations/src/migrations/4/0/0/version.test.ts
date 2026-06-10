import fs from 'node:fs';
import path from 'node:path';
import versionConfig from './version';

const migrationDir = __dirname;

describe('migration v4.0.0', () => {
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
        const upFile = path.join(migrationDir, `${script.up}.sql`);
        const downFile = path.join(migrationDir, `${script.down}.sql`);
        expect(fs.existsSync(upFile)).toBe(true);
        expect(fs.existsSync(downFile)).toBe(true);
      }
    }
  });

  it('creates chat_sessions table with user FK', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('CREATE TABLE financial_management.chat_sessions');
    expect(sql).toContain(
      'REFERENCES financial_management.users(id) ON DELETE CASCADE',
    );
    expect(sql).toContain('last_message_at');
    expect(sql).toContain("metadata        jsonb NOT NULL DEFAULT '{}'::jsonb");
  });

  it('creates chat_messages table with session FK and human-in-the-loop columns', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('CREATE TABLE financial_management.chat_messages');
    expect(sql).toContain(
      'REFERENCES financial_management.chat_sessions(id) ON DELETE CASCADE',
    );
    expect(sql).toContain('task_token');
    expect(sql).toContain('task_token_status');
  });

  it('enforces role, attachment_type and task_token_status with CHECK constraints', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain("CHECK (role IN ('user', 'assistant', 'system'))");
    expect(sql).toContain(
      "attachment_type IS NULL OR attachment_type IN ('image', 'audio')",
    );
    expect(sql).toContain(
      "task_token_status IS NULL OR task_token_status IN ('pending', 'confirmed', 'cancelled', 'expired')",
    );
  });

  it('creates indexes for user activity, message ordering and pending task tokens', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('idx_chat_sessions_user_last_message');
    expect(sql).toContain('idx_chat_messages_session_created');
    expect(sql).toContain('idx_chat_messages_pending_task_token');
  });

  it('attaches updated_at and audit triggers to both tables', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('trg_chat_sessions_updated_at');
    expect(sql).toContain('trg_chat_messages_updated_at');
    expect(sql).toContain('trg_chat_sessions_audit');
    expect(sql).toContain('trg_chat_messages_audit');
  });

  it('enables row level security and authenticated policies scoped by user', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain(
      'ALTER TABLE financial_management.chat_sessions ENABLE ROW LEVEL SECURITY',
    );
    expect(sql).toContain(
      'ALTER TABLE financial_management.chat_messages ENABLE ROW LEVEL SECURITY',
    );
    expect(sql).toContain(
      'CREATE POLICY authenticated_select ON financial_management.chat_sessions',
    );
    expect(sql).toContain(
      'CREATE POLICY authenticated_select ON financial_management.chat_messages',
    );
    expect(sql).toContain('auth.uid()');
  });

  it('grants SELECT on chat tables to readonly_lambda_role', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain(
      'GRANT SELECT ON financial_management.chat_sessions TO readonly_lambda_role',
    );
    expect(sql).toContain(
      'GRANT SELECT ON financial_management.chat_messages TO readonly_lambda_role',
    );
  });

  it('down script drops both chat tables in reverse order', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.down}.sql`),
      'utf-8',
    );
    expect(sql).toContain(
      'DROP TABLE IF EXISTS financial_management.chat_messages',
    );
    expect(sql).toContain(
      'DROP TABLE IF EXISTS financial_management.chat_sessions',
    );
    // chat_messages must be dropped before chat_sessions (FK dependency)
    const messagesIdx = sql.indexOf(
      'DROP TABLE IF EXISTS financial_management.chat_messages',
    );
    const sessionsIdx = sql.indexOf(
      'DROP TABLE IF EXISTS financial_management.chat_sessions',
    );
    expect(messagesIdx).toBeLessThan(sessionsIdx);
  });
});
