import fs from 'node:fs';
import path from 'node:path';

/**
 * Yields every TypeScript source file under the given directory, descending into all but the excluded
 * directories. A directory that does not exist yields nothing.
 */
export function* listSourceFiles(rootDir: string, excludedDirs: ReadonlySet<string>): Generator<string> {
  if (!fs.existsSync(rootDir)) return;

  const pendingDirs = [rootDir];

  while (pendingDirs.length > 0) {
    const dir = pendingDirs.pop();
    if (dir === undefined) continue;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!excludedDirs.has(entry.name)) pendingDirs.push(entryPath);
      } else if (entry.name.endsWith('.ts')) {
        yield entryPath;
      }
    }
  }
}
