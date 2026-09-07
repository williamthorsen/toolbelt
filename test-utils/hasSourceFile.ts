import { listSourceFiles } from './listSourceFiles.ts';
import { NON_SOURCE_DIRS } from './non-source-dirs.ts';

/**
 * Reports whether a directory holds at least one TypeScript file at any depth, which marks a maturity tier
 * as present. Git tracks files rather than directories, so a directory's own existence does not survive a fresh
 * clone, and an audit keyed on it reaches a verdict that CI cannot reproduce.
 */
export function hasSourceFile(directory: string): boolean {
  return !listSourceFiles(directory, NON_SOURCE_DIRS).next().done;
}
