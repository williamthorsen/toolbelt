import {
  type AdoptionSite,
  findEnclosingBody,
  type FunctionBody,
  getLineAtOffset,
  listFunctionBodies,
  readImportBindings,
  readLiteral,
} from '@williamthorsen/toolbelt.adoption';

export type ParserSiteKind = 'flag-scan' | 'node-parse-args';

// A blanked string literal keeps its quotes, so a literal of any content matches here and its text is read from
// the source beneath.
const LITERAL = String.raw`(?<literal>'[^'\n]*'|"[^"\n]*")`;
const FLAG_COMPARISONS = [
  new RegExp(String.raw`(?:===|!==)\s*${LITERAL}`, 'dg'),
  new RegExp(String.raw`${LITERAL}\s*(?:===|!==)`, 'dg'),
  new RegExp(String.raw`\bcase\s+${LITERAL}\s*:`, 'dg'),
  new RegExp(String.raw`\.(?:includes|indexOf)\(\s*${LITERAL}\s*\)`, 'dg'),
];
// A long flag, or a short flag of one letter. A bare `--` ends the options rather than naming one.
const FLAG_NAME = /^(?:-[A-Za-z]|--[A-Za-z][\w-]*)$/;
const PLATFORM_EXPORT = 'parseArgs';
const PLATFORM_SPECIFIERS = ['node:util', 'util'];

/**
 * Lists the hand-rolled argument parsing in a source: each call to the platform's `parseArgs` from `node:util`,
 * and each function comparing a value against a flag-shaped literal.
 *
 * A function's comparisons report once, at the first of them, so that a parser handling many flags is one site.
 * Comparisons outside every named function report once for the file. The scan reads the code blanked by the kit
 * assembler, so an idiom written in a comment or a literal is not one, and reads a compared literal's text from
 * the source beneath.
 *
 * @internal
 */
export function listParserSites(code: string, source: string): Array<AdoptionSite<ParserSiteKind>> {
  return [...listPlatformParseCalls(code, source), ...listFlagScans(code, source)].toSorted(
    (left, right) => left.line - right.line,
  );
}

// region | Helpers

/** Lists one site per function, or for the file's top-level code, that compares a value against a flag. */
function listFlagScans(code: string, source: string): Array<AdoptionSite<ParserSiteKind>> {
  const bodies = listFunctionBodies(code);
  const firstOffsets = new Map<FunctionBody | undefined, number>();

  for (const pattern of FLAG_COMPARISONS) {
    for (const match of code.matchAll(pattern)) {
      if (!FLAG_NAME.test(readLiteral(source, match.indices?.groups?.['literal']) ?? '')) continue;

      const body = findEnclosingBody(bodies, match.index);
      const first = firstOffsets.get(body);
      if (first === undefined || match.index < first) firstOffsets.set(body, match.index);
    }
  }

  return [...firstOffsets].map(([body, offset]) => ({
    kind: 'flag-scan',
    line: getLineAtOffset(source, offset),
    ...(body !== undefined && { symbol: body.name }),
  }));
}

/** Lists each call to `parseArgs` through a binding imported from `node:util`. */
function listPlatformParseCalls(code: string, source: string): Array<AdoptionSite<ParserSiteKind>> {
  const { functions, namespaces } = readImportBindings(code, source, {
    exportName: PLATFORM_EXPORT,
    specifiers: PLATFORM_SPECIFIERS,
  });
  const callees = [
    ...[...functions].map((name) => String.raw`(?<![.\w$])${RegExp.escape(name)}`),
    ...[...namespaces].map((name) => String.raw`(?<![.\w$])${RegExp.escape(name)}\s*\.\s*${PLATFORM_EXPORT}`),
  ];
  if (callees.length === 0) return [];

  const call = new RegExp(String.raw`(?:${callees.join('|')})\s*\(`, 'g');
  return code
    .matchAll(call)
    .map((match): AdoptionSite<ParserSiteKind> => ({
      kind: 'node-parse-args',
      line: getLineAtOffset(source, match.index),
    }))
    .toArray();
}

// endregion | Helpers
