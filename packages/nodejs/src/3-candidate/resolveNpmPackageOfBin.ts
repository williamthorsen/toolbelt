import fs from 'node:fs';

const NODE_MODULES_SEGMENT = 'node_modules/';

/**
 * Resolves the npm package that installed a bin, from the symlink that npm leaves in a `bin` directory: the
 * package is the name after the first `node_modules/` in the link's target, two segments for a scoped name.
 * The first occurrence rather than the last, so a bin nested under a global package's own `node_modules`
 * still names the global package. Returns `undefined` where the path is not a symlink, does not exist, or
 * links to a target outside a `node_modules` directory.
 *
 * @category npm
 * @experimental
 * @stage candidate
 */
export function resolveNpmPackageOfBin(binPath: string): string | undefined {
  const target = readLinkTarget(binPath);
  if (target === undefined) return undefined;

  const index = target.indexOf(NODE_MODULES_SEGMENT);
  if (index === -1) return undefined;

  const [first, second] = target.slice(index + NODE_MODULES_SEGMENT.length).split('/', 2);
  if (first === undefined || first === '') return undefined;
  if (!first.startsWith('@')) return first;

  return second === undefined || second === '' ? undefined : `${first}/${second}`;
}

// region | Helpers

/** Reads a symlink's target, or `undefined` where the path is missing or is not a symlink. */
function readLinkTarget(linkPath: string): string | undefined {
  try {
    return fs.readlinkSync(linkPath);
  } catch {
    return undefined;
  }
}

// endregion | Helpers
