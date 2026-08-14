import { type ExitMock, listExitMocks } from './listExitMocks.ts';
import { PACKAGE_NAME } from './packageName.ts';

export interface Finding extends ExitMock {
  path: string;
}

export interface ProjectSummary {
  /** Calls into this package, counted only in test files that import it. */
  adopted: number;
  findings: Finding[];
  sourceCount: number;
}

export interface SourceText {
  path: string;
  text: string;
}

const EXPORT_NAMES = 'makeFixture|silenceConsole|throwOnProcessExit';
const SPECIFIER = String.raw`${PACKAGE_NAME.replaceAll('.', String.raw`\.`)}(?:/[\w-]+)*`;
const CALL = new RegExp(String.raw`\b(?:${EXPORT_NAMES})\s*\(`, 'g');
const PACKAGE_IMPORT = new RegExp(String.raw`(?:from|require\()\s*['"]${SPECIFIER}['"]`);

/**
 * Classifies every hand-rolled `process.exit` mock across a project's test files, and counts how far adoption
 * already got.
 *
 * @internal
 */
export function summarizeSources(sources: readonly SourceText[]): ProjectSummary {
  return {
    adopted: sources.reduce((total, source) => total + countAdoptedCalls(source.text), 0),
    findings: sources.flatMap((source) => listExitMocks(source.text).map((mock) => ({ ...mock, path: source.path }))),
    sourceCount: sources.length,
  };
}

/**
 * Counts calls into this package within one source, and none where the source never imports it.
 *
 * The import is what separates adoption from a name collision: a project that hand-rolls a helper of the same
 * name calls it as often as an adopter calls this one.
 *
 * @internal
 */
export function countAdoptedCalls(text: string): number {
  return PACKAGE_IMPORT.test(text) ? text.matchAll(CALL).toArray().length : 0;
}
