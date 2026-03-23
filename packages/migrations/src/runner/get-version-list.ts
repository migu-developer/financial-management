import fs from 'node:fs';
import path from 'node:path';
import { SemanticVersion } from 'src/lib/semantic-version';
import type { Version, VersionConfig } from 'src/interfaces/version';

function readNumericDirs(dir: string): number[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => parseInt(d.name, 10))
    .sort((a, b) => a - b);
}

export function getVersionList(migrationsDir: string): Version[] {
  const versions: Version[] = [];

  for (const major of readNumericDirs(migrationsDir)) {
    const majorDir = path.join(migrationsDir, String(major));
    for (const minor of readNumericDirs(majorDir)) {
      const minorDir = path.join(majorDir, String(minor));
      for (const patch of readNumericDirs(minorDir)) {
        const patchDir = path.join(minorDir, String(patch));
        const versionFile = path.join(patchDir, 'version.ts');

        if (!fs.existsSync(versionFile)) continue;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require(versionFile);
        const config: VersionConfig = mod.default ?? mod;

        versions.push({
          major,
          minor,
          patch,
          config,
          path: patchDir,
        });
      }
    }
  }

  versions.sort((a, b) => {
    const va = SemanticVersion.fromPath(a.major, a.minor, a.patch);
    const vb = SemanticVersion.fromPath(b.major, b.minor, b.patch);
    return va.compareTo(vb);
  });

  return versions;
}
