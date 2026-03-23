export type ScriptEntry =
  | { type: 'sql'; up: string; down: string }
  | { type: 'ts'; path: string }
  | { type: 'seed'; up: string; down: string };

export function sqlScript(up: string, down: string): ScriptEntry {
  return { type: 'sql', up, down };
}

export function tsScript(path: string): ScriptEntry {
  return { type: 'ts', path };
}

export function seedScript(up: string, down: string): ScriptEntry {
  return { type: 'seed', up, down };
}

export function config(opts: { description: string; scripts: ScriptEntry[] }) {
  return opts;
}
