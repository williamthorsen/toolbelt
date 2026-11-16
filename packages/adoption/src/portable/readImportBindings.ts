import { readLiteral } from './readLiteral.ts';

export interface ImportBindings {
  /** Local names bound to the export itself. */
  functions: Set<string>;
  /** Local names bound to the module object, through which the export is reached as a member. */
  namespaces: Set<string>;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const IMPORT_STATEMENT = /\bimport\s+(?!type\b)(?<clause>[^;'"]*?)\s*\bfrom\s*(?<specifier>'[^'\n]*'|"[^"\n]*")/dg;
const NAMESPACE_BINDING = /^\*\s*as\s+(?<name>[A-Za-z_$][\w$]*)$/;
const NAMED_BINDING = /^(?<imported>[A-Za-z_$][\w$]*)(?:\s+as\s+(?<local>[A-Za-z_$][\w$]*))?$/;

/**
 * Reads the local names through which a source imports an export from any of the given module specifiers.
 *
 * The statements are matched on the blanked code, so an import written in a comment or a literal is not read,
 * while each specifier's text is read from the source beneath. A default import counts as a namespace, which holds
 * for a module whose default export is the module object, such as a Node builtin. A type-only import binds no
 * value and is not read.
 *
 * @internal
 */
export function readImportBindings(
  code: string,
  source: string,
  target: { exportName: string; specifiers: readonly string[] },
): ImportBindings {
  const specifiers = new Set(target.specifiers);
  const functions = new Set<string>();
  const namespaces = new Set<string>();

  for (const match of code.matchAll(IMPORT_STATEMENT)) {
    if (!specifiers.has(readLiteral(source, match.indices?.groups?.['specifier']) ?? '')) continue;

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
      if (binding?.['imported'] === target.exportName) functions.add(binding['local'] ?? target.exportName);
    }
  }

  return { functions, namespaces };
}
