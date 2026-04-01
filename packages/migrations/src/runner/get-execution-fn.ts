import fs from 'node:fs';
import path from 'node:path';
import type { PoolClient } from 'pg';
import type { ScriptEntry } from 'src/lib/version-config';
import type { UpDownExecution } from 'src/interfaces/execution';

function loadSql(versionDir: string, filename: string): string {
  const filePath = filename.endsWith('.sql')
    ? path.join(versionDir, filename)
    : path.join(versionDir, `${filename}.sql`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function sqlExec(sql: string) {
  return async (client: PoolClient) => {
    await client.query(sql);
  };
}

export function getExecutionFunctions(
  versionDir: string,
  scripts: ScriptEntry[],
): UpDownExecution[] {
  return scripts.map((script): UpDownExecution => {
    switch (script.type) {
      case 'sql':
      case 'seed': {
        const upSql = loadSql(versionDir, script.up);
        const downSql = loadSql(versionDir, script.down);
        return { up: sqlExec(upSql), down: sqlExec(downSql) };
      }
      case 'ts': {
        const tsPath = path.join(versionDir, script.path);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require(tsPath);
        if (typeof mod.up !== 'function' || typeof mod.down !== 'function') {
          throw new Error(
            `TS migration ${tsPath} must export up() and down() functions`,
          );
        }
        return { up: mod.up, down: mod.down };
      }
    }
  });
}
