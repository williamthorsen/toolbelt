// `_` and `/` are interchangeable branch-name separators, so both delimit a segment.
const SEGMENT_SEPARATOR = /[/_]/;

// The key group is optional, so one pattern covers a keyed ref and a bare-numeric one alike.
const REF_PATTERN = /^(?:(?<key>[A-Za-z][A-Za-z0-9]+)-)?(?<number>[0-9]+)(?:\.(?<revisit>[0-9]+))?/;

// A Jira project key: a letter, then letters and digits.
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]+$/;

/**
 * Finds the ticket ref encoded by a branch name, or `undefined` when it encodes none. A ref must begin a
 * `/`- or `_`-delimited segment, and the leftmost segment carrying one wins. A key must be uppercase,
 * unless `key` names the project's own key, which then matches in any casing and is the only key that
 * does; a bare-numeric ref is found either way. Throws a RangeError if `key` is not a well-formed key.
 *
 * @category Git
 * @experimental
 * @stage candidate
 */
export function findBranchTicketRef(branch: string, options: BranchTicketRefOptions = {}): BranchTicketRef | undefined {
  const { key: declaredKey } = options;

  if (declaredKey !== undefined && !KEY_PATTERN.test(declaredKey)) {
    const received = `Received ${JSON.stringify(declaredKey)}.`;
    throw new RangeError(`Invalid key: a key must be a letter followed by letters or digits. ${received}`);
  }

  for (const segment of branch.split(SEGMENT_SEPARATOR)) {
    const groups = REF_PATTERN.exec(segment)?.groups;
    if (groups === undefined) {
      continue;
    }
    const { key, number, revisit } = groups;
    // A segment that has the shape but carries an unacceptable key is skipped, not taken as the answer.
    if (number !== undefined && isAcceptableKey(key, declaredKey)) {
      return composeRef(key, number, revisit);
    }
  }
  return undefined;
}

export interface BranchTicketRef {
  /** The canonical ID: an uppercased key and number (`MAC-22`), or the number alone for a bare-numeric ref. */
  readonly id: string;
  /** The uppercased project key, absent for a bare-numeric ref. */
  readonly key?: string | undefined;
  readonly number: number;
  /** The revisit ordinal, present when the ref carries a `.N` suffix. */
  readonly revisit?: number | undefined;
}

export interface BranchTicketRefOptions {
  /** The project's own key, which then matches in any casing and displaces the uppercase-key rule. */
  readonly key?: string | undefined;
}

// region | Helpers

/** Assembles a ref from the matched groups, uppercasing the key to the canonical spelling of the ticket. */
function composeRef(key: string | undefined, number: string, revisit: string | undefined): BranchTicketRef {
  const canonicalKey = key?.toUpperCase();

  return {
    id: canonicalKey === undefined ? number : `${canonicalKey}-${number}`,
    ...(canonicalKey !== undefined && { key: canonicalKey }),
    number: Number(number),
    ...(revisit !== undefined && { revisit: Number(revisit) }),
  };
}

/**
 * Whether a matched key may stand as the ref's key: a missing one always may, a declared key only when
 * the match spells it, and any key at all only when it is uppercase.
 */
function isAcceptableKey(key: string | undefined, declaredKey: string | undefined): boolean {
  if (key === undefined) {
    return true;
  }
  if (declaredKey !== undefined) {
    return key.toLowerCase() === declaredKey.toLowerCase();
  }
  return key === key.toUpperCase();
}

// endregion | Helpers
