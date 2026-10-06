import {
  type AdoptionSite,
  blankNonCode,
  type FunctionBody,
  getLineAtOffset,
  listFunctionBodies,
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
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const IMPORT_STATEMENT = /\bimport\s+(?!type\b)(?<clause>[^;'"]*?)\s*\bfrom\s*(?<specifier>'[^'\n]*'|"[^"\n]*")/dg;
const NAMESPACE_BINDING = /^\*\s*as\s+(?<name>[A-Za-z_$][\w$]*)$/;
const NAMED_BINDING = /^(?<imported>[A-Za-z_$][\w$]*)(?:\s+as\s+(?<local>[A-Za-z_$][\w$]*))?$/;
const PLATFORM_SPECIFIERS = new Set(['node:util', 'util']);
const PLATFORM_EXPORT = 'parseArgs';

/**
 * Lists the hand-rolled argument parsing in a source: each call to the platform's `parseArgs` from `node:util`,
 * and each function comparing a value against a flag-shaped literal.
 *
 * A function's comparisons report once, at the first of them, so that a parser handling many flags is one site.
 * Comparisons outside every named function report once for the file. The source is blanked before the scan, so an
 * idiom written in a comment or a literal is invisible here, while a compared literal's text is still read from
 * the source beneath.
 *
 * @internal
 */
export function listParserSites(source: string): Array<AdoptionSite<ParserSiteKind>> {
  const code = blankNonCode(source);

  return [...listPlatformParseCalls(code, source), ...listFlagScans(code, source)].toSorted(
    (left, right) => left.line - right.line,
  );
}

// region | Helpers

/** Returns the innermost function whose body contains an offset, if any does. */
function findEnclosingBody(bodies: readonly FunctionBody[], offset: number): FunctionBody | undefined {
  let enclosing: FunctionBody | undefined;
  for (const body of bodies) {
    const contains = body.bodyStart <= offset && offset < body.bodyEnd;
    if (contains && (enclosing === undefined || body.bodyStart > enclosing.bodyStart)) enclosing = body;
  }
  return enclosing;
}

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
  const { functions, namespaces } = readPlatformBindings(code, source);
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

/** Reads the local names through which a source reaches the platform's `parseArgs`. */
function readPlatformBindings(code: string, source: string): { functions: Set<string>; namespaces: Set<string> } {
  const functions = new Set<string>();
  const namespaces = new Set<string>();

  for (const match of code.matchAll(IMPORT_STATEMENT)) {
    if (!PLATFORM_SPECIFIERS.has(readLiteral(source, match.indices?.groups?.['specifier']) ?? '')) continue;

    const clause = match.groups?.['clause'] ?? '';
    const braceStart = clause.indexOf('{');
    const named = braceStart === -1 ? '' : clause.slice(braceStart + 1, clause.lastIndexOf('}'));
    const unnamed = braceStart === -1 ? clause : clause.slice(0, braceStart);

    for (const entry of unnamed.split(',')) {
      const part = entry.trim();
      const namespace = NAMESPACE_BINDING.exec(part)?.groups?.['name'];
      if (namespace !== undefined) namespaces.add(namespace);
      else if (IDENTIFIER.test(part)) namespaces.add(part);
    }

    for (const entry of named.split(',')) {
      const binding = NAMED_BINDING.exec(entry.trim())?.groups;
      if (binding?.['imported'] === PLATFORM_EXPORT) functions.add(binding['local'] ?? PLATFORM_EXPORT);
    }
  }

  return { functions, namespaces };
}

// endregion | Helpers
