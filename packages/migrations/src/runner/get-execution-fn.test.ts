import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getExecutionFunctions } from './get-execution-fn';
import type { ScriptEntry } from 'src/lib/version-config';

describe('getExecutionFunctions', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-fn-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads SQL scripts and returns up/down functions', () => {
    fs.writeFileSync(path.join(tmpDir, '1_up_test.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(tmpDir, '1_down_test.sql'), 'SELECT 2;');

    const scripts: ScriptEntry[] = [
      { type: 'sql', up: '1_up_test', down: '1_down_test' },
    ];

    const fns = getExecutionFunctions(tmpDir, scripts);
    expect(fns).toHaveLength(1);
    expect(typeof fns[0]!.up).toBe('function');
    expect(typeof fns[0]!.down).toBe('function');
  });

  it('loads SQL files with .sql extension in the name', () => {
    fs.writeFileSync(path.join(tmpDir, '1_up_test.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(tmpDir, '1_down_test.sql'), 'SELECT 2;');

    const scripts: ScriptEntry[] = [
      { type: 'sql', up: '1_up_test.sql', down: '1_down_test.sql' },
    ];

    const fns = getExecutionFunctions(tmpDir, scripts);
    expect(fns).toHaveLength(1);
  });

  it('loads seed scripts the same way as sql', () => {
    fs.writeFileSync(path.join(tmpDir, 'up.sql'), 'INSERT INTO t VALUES (1);');
    fs.writeFileSync(path.join(tmpDir, 'down.sql'), 'DELETE FROM t;');

    const scripts: ScriptEntry[] = [{ type: 'seed', up: 'up', down: 'down' }];

    const fns = getExecutionFunctions(tmpDir, scripts);
    expect(fns).toHaveLength(1);
  });

  it('throws when SQL file does not exist', () => {
    const scripts: ScriptEntry[] = [
      { type: 'sql', up: 'nonexistent', down: 'also_nonexistent' },
    ];

    expect(() => getExecutionFunctions(tmpDir, scripts)).toThrow(
      'SQL file not found',
    );
  });

  it('loads TS scripts with up/down exports', () => {
    const jsFile = path.join(tmpDir, 'migrate.js');
    fs.writeFileSync(
      jsFile,
      `module.exports = {
        up: async function(client) { await client.query('SELECT 1'); },
        down: async function(client) { await client.query('SELECT 2'); },
      };`,
    );

    const scripts: ScriptEntry[] = [{ type: 'ts', path: 'migrate.js' }];
    const fns = getExecutionFunctions(tmpDir, scripts);
    expect(typeof fns[0]!.up).toBe('function');
    expect(typeof fns[0]!.down).toBe('function');
  });

  it('throws when TS script is missing up/down exports', () => {
    const jsFile = path.join(tmpDir, 'bad.js');
    fs.writeFileSync(jsFile, `module.exports = {};`);

    const scripts: ScriptEntry[] = [{ type: 'ts', path: 'bad.js' }];
    expect(() => getExecutionFunctions(tmpDir, scripts)).toThrow(
      'must export up() and down()',
    );
  });
});
