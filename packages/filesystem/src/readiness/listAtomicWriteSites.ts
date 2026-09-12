import {
  type AdoptionSite,
  getLineAtOffset,
  listFunctionBodies,
  PARENTHESES,
  readBalancedGroup,
} from '@williamthorsen/toolbelt.adoption';

export type AtomicWriteKind = 'temp-write-rename';

// The path argument, read only where it is a bare binding that a later call can name again. A computed argument
// fails the class, and with it the pairing on which the finding rests.
const BOUND_PATH_ARGUMENT = /^\s*(?<name>[A-Za-z_$][\w$]*)\s*(?:,|$)/;
// The receiver is unconstrained: `fs.`, `fsp.`, `await fs.promises.`, and a destructured import all reach the same
// call, and requiring the write and the rename to name one binding already carries the match. The word boundary
// still declines a longer name ending in the anchor, such as `safeRename` or `renameFile`.
const RENAME_CALL = /\brename(?:Sync)?\s*\(/g;
const WRITE_CALL = /\bwriteFile(?:Sync)?\s*\(/g;

interface PathArgument {
  name: string;
  /** The call's own offset within the body that holds it. */
  offset: number;
}

interface RenameClaim {
  /** The enclosing body's length, by which a nested function outbids every function around it. */
  bodyLength: number;
  /** The rename's own offset in the whole source. */
  offset: number;
  site: AdoptionSite<AtomicWriteKind>;
}

/**
 * Lists every hand-rolled atomic write in a source, which is a function body that writes a path held in a binding
 * and renames that same binding.
 *
 * Takes the blanked code produced by `listFilesystemIdioms`, so a write written in a comment or a literal is not
 * one. Blanking preserves every offset, so a reported line still names the line held by the source.
 *
 * The pairing is what holds the finding: A write alone, a rename alone, and a rename of a path that the body
 * copied rather than wrote each leave the body unreported. A body pairing twice reports twice, since each rename
 * is a mechanism of its own to replace.
 *
 * The line reported is the rename's and the symbol is the innermost function enclosing it. The rename is the act
 * that identifies the idiom, and the enclosing function usually does more than write, so the substitution
 * replaces a mechanism rather than retiring a function. A write and rename at module scope go unreported, no
 * function body holding them.
 *
 * @internal
 */
export function listAtomicWriteSites(code: string): Array<AdoptionSite<AtomicWriteKind>> {
  // Keyed on the rename's offset in the whole source: A nested function and every function around it hold the
  // same rename, and the innermost of them is the one whose name describes the site.
  const claims = new Map<number, RenameClaim>();

  for (const fn of listFunctionBodies(code)) {
    const body = code.slice(fn.bodyStart, fn.bodyEnd);
    const writes = listPathArguments(body, WRITE_CALL);
    const bodyLength = fn.bodyEnd - fn.bodyStart;

    for (const rename of listPathArguments(body, RENAME_CALL)) {
      const isPaired = writes.some((write) => write.name === rename.name && write.offset < rename.offset);
      if (!isPaired) continue;

      const offset = fn.bodyStart + rename.offset;
      const claimed = claims.get(offset);
      if (claimed !== undefined && claimed.bodyLength <= bodyLength) continue;

      claims.set(offset, {
        bodyLength,
        offset,
        site: { kind: 'temp-write-rename', line: getLineAtOffset(code, offset), symbol: fn.name },
      });
    }
  }

  return claims
    .values()
    .toArray()
    .toSorted((a, b) => a.offset - b.offset)
    .map((claim) => claim.site);
}

// region | Helpers

/** Lists every call of a pattern in a body whose first argument is a bare binding, with the binding it names. */
function listPathArguments(body: string, pattern: RegExp): PathArgument[] {
  const calls: PathArgument[] = [];

  for (const match of body.matchAll(pattern)) {
    const argumentList = readBalancedGroup(body, match.index + match[0].length - 1, PARENTHESES);
    if (argumentList === undefined) continue;

    const name = BOUND_PATH_ARGUMENT.exec(body.slice(argumentList.start + 1, argumentList.end - 1))?.groups?.['name'];
    if (name !== undefined) calls.push({ name, offset: match.index });
  }

  return calls;
}

// endregion | Helpers
