import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolves a relative specifier to the file it names. The repo writes the `.ts` extension explicitly, but the
 * extensionless forms are tried too, because an unresolved specifier drops a real edge from an import walk.
 */
export function resolveSpecifier(importerDir: string, specifier: string): string | undefined {
  const base = path.resolve(importerDir, specifier);

  return [base, `${base}.ts`, path.join(base, 'index.ts')].find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
}
