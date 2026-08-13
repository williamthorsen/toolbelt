import { findExemption } from './exemptions.ts';

const SOURCE_EXTENSION = /\.[cm]?[jt]sx?$/;

/**
 * Narrows a project's file list to the JavaScript and TypeScript sources these checks read.
 *
 * @internal
 */
export function listSourceFiles(paths: readonly string[]): string[] {
  return paths.filter((path) => SOURCE_EXTENSION.test(path) && findExemption(path) === undefined);
}
