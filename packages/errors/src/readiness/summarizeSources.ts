import { type ErrorSite, listErrorSites } from './listErrorSites.ts';
import { PACKAGE_NAME } from './packageName.ts';

export interface Finding extends ErrorSite {
  path: string;
}

export interface ProjectSummary {
  /** Calls into this package, counted only in sources that import it. */
  adopted: number;
  findings: Finding[];
  sourceCount: number;
}

export interface SourceText {
  path: string;
  text: string;
}

const EXPORT_NAMES = `assertIsError|chainError|describeError|isError`;
const CALL = new RegExp(String.raw`\b(?:${EXPORT_NAMES})\s*\(`, 'g');

/**
 * Classifies every hand-rolled site across a project's sources, and counts how far adoption already got.
 *
 * @internal
 */
export function summarizeSources(sources: readonly SourceText[]): ProjectSummary {
  return {
    adopted: sources.reduce((total, source) => total + countAdoptedCalls(source.text), 0),
    findings: sources.flatMap((source) => listErrorSites(source.text).map((site) => ({ ...site, path: source.path }))),
    sourceCount: sources.length,
  };
}

/**
 * Counts calls into this package within one source, and none where the source never imports it.
 *
 * The import is what separates adoption from a name collision. A project that hand-rolls its own
 * `describeError` calls that name as often as an adopter calls this one, and counting those would report a
 * project as adopted in the same breath as naming the clone it should retire.
 *
 * @internal
 */
export function countAdoptedCalls(text: string): number {
  return importsPackage(text) ? text.matchAll(CALL).toArray().length : 0;
}

// region | Helpers

/** Reports whether a source imports this package, from the package root or any of its subpaths. */
function importsPackage(text: string): boolean {
  const specifier = String.raw`${PACKAGE_NAME.replaceAll('.', String.raw`\.`)}(?:/[\w-]+)*`;
  return new RegExp(String.raw`(?:from|require\()\s*['"]${specifier}['"]`).test(text);
}

// endregion | Helpers
