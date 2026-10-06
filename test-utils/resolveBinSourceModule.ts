import fs from 'node:fs';
import path from 'node:path';

// A bin target names a committed wrapper, which exists when pnpm links bins during an install that
// precedes the build. A target naming build output fails the link, and pnpm never retries it.
const BIN_TARGET_PATTERN = /^\.\/bin\/(?<wrapperName>[^/]+\.js)$/;

// The build mirrors `src/` into `dist/esm/`, so the wrapper's build-output reference names the module
// that emitted it.
const BUILD_OUTPUT_PATTERN = /new URL\(['"]\.\.\/dist\/esm\/(?<modulePath>.+?)\.js['"]/;

/**
 * Follows a declared bin target through its committed wrapper to the source module that the wrapper loads,
 * returning that module's path or what disqualifies the target.
 */
export function resolveBinSourceModule(packageDirectory: string, target: string): BinResolution {
  const wrapperName = BIN_TARGET_PATTERN.exec(target)?.groups?.['wrapperName'];
  if (wrapperName === undefined) return { fault: 'names no committed wrapper under bin/' };

  const wrapperPath = path.join(packageDirectory, 'bin', wrapperName);
  if (!fs.existsSync(wrapperPath)) return { fault: `reaches no wrapper at bin/${wrapperName}` };

  const wrapper = fs.readFileSync(wrapperPath, 'utf8');
  if (!wrapper.startsWith('#!')) return { fault: 'reaches a wrapper with no shebang' };

  const modulePath = BUILD_OUTPUT_PATTERN.exec(wrapper)?.groups?.['modulePath'];
  if (modulePath === undefined) return { fault: 'reaches a wrapper naming no build output' };

  const sourcePath = path.join(packageDirectory, 'src', `${modulePath}.ts`);
  if (!fs.existsSync(sourcePath)) {
    return { fault: `names a build output reaching no source module at src/${modulePath}.ts` };
  }

  return { sourcePath };
}

/** The source module that a bin target loads, or what disqualifies the target. */
export type BinResolution = { readonly fault: string } | { readonly sourcePath: string };
