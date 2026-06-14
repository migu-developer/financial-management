import fs from 'node:fs';
import path from 'node:path';
import versionConfig from './version';

const migrationDir = __dirname;

describe('migration v4.1.0', () => {
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

  it('up adds the superseded value to the status CHECK', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.up}.sql`),
      'utf-8',
    );
    expect(sql).toContain('chk_chat_messages_task_token_status');
    expect(sql).toContain('superseded');
  });

  it('down normalizes superseded rows before tightening the constraint', () => {
    const script = versionConfig.scripts[0]!;
    if (script.type !== 'sql') return;
    const sql = fs.readFileSync(
      path.join(migrationDir, `${script.down}.sql`),
      'utf-8',
    );
    expect(sql).toContain("SET task_token_status = 'cancelled'");
    expect(sql).not.toContain("'superseded')");
  });
});
