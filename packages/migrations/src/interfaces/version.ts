import type { ScriptEntry } from 'src/lib/version-config';

export interface VersionConfig {
  description: string;
  scripts: ScriptEntry[];
}

export interface Version {
  major: number;
  minor: number;
  patch: number;
  config: VersionConfig;
  path: string;
}
