import { listStringLeaves } from './listStringLeaves.ts';
import { readManifest } from './readManifest.ts';

const EXPORT_TARGET_PATTERN = /^\.\/dist\/esm\/(?<tier>[^/]+)\/index\.js$/;

/**
 * Reads a package's `exports` map, pairing each target with the maturity tier its path names. A target naming no
 * tier pairs with `undefined`, which is what lets a caller tell an unrecognized entry point from a missing one.
 */
export function listExportTargets(packageDirectory: string): ExportTarget[] {
  return listStringLeaves(readManifest(packageDirectory)['exports']).map((target) => ({
    target,
    tier: EXPORT_TARGET_PATTERN.exec(target)?.groups?.['tier'],
  }));
}

/** A target declared by an `exports` map, and the maturity tier its path names. */
export interface ExportTarget {
  readonly target: string;
  readonly tier: string | undefined;
}
