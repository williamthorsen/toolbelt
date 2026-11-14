import {
  condenseWhitespace,
  getLineAtOffset,
  listFunctionBodies,
  PARENTHESES,
  readBalancedGroup,
  readLiteral,
} from '@williamthorsen/toolbelt.adoption';

export interface MissingPathSite {
  /** One past the site's last character. */
  end: number;
  kind: MissingPathSiteKind;
  line: number;
  /** The site's first character. */
  start: number;
  /** The function's name, on a `missing-path-clone` alone. */
  symbol?: string;
}

export type MissingPathSiteKind = 'missing-path-clone' | 'missing-path-partial' | 'missing-path-test';

type MissingPathCode = 'ENOENT' | 'ENOTDIR';

interface Comparison {
  code: MissingPathCode;
  end: number;
  /** The operand's text, condensed, with optional chaining read as plain member access. */
  operand: string;
  start: number;
}

const MISSING_PATH_CODES: readonly MissingPathCode[] = ['ENOENT', 'ENOTDIR'];
// Blanking keeps a literal's quotes and replaces what is between them with spaces, so a quoted run of spaces is
// where a string literal stood. A template literal containing an interpolation keeps its `${`, and never matches.
const BLANKED_LITERAL = /(['"`]) *\1/dg;
const OPERATOR_BEFORE = /(?:===|==|!==|!=)\s*$/;
const OPERATOR_AFTER = /\s*(?:===|==|!==|!=)\s*/y;
const CHAINED_CODE_AFTER = /(?:[\w$]+\??\.)*code(?![\w$])/y;
const MEMBER_CODE_AFTER = /\??\.code(?![\w$])/y;
const MERGE_SEPARATOR = /^[\s()]*(?:\|\||&&)[\s()]*$/;
const IF_HEAD = /\bif\s*\(/;

/**
 * Lists the tests in a source of an error's `code` against `ENOENT` or `ENOTDIR`, the codes that
 * `isMissingPathError` treats as a missing path.
 *
 * Takes the source and the blanked code produced from it by `blankNonCode`. Every match is made on the blanked
 * code, so a code named in a comment or in prose is invisible, and each literal's text is read from the source
 * at the same offsets.
 *
 * Comparisons of one operand joined by `||` or `&&` form one site, which is a `missing-path-test` when it covers
 * both codes and a `missing-path-partial` when it covers one: Adopting the predicate at a partial site widens
 * what the site treats as absent. A function whose whole body tests its own parameter against both codes is one
 * `missing-path-clone`, named by the function, in place of the comparisons inside it. A function testing one
 * code is not a clone, because replacing it with the predicate would widen every caller.
 *
 * @internal
 */
export function listMissingPathSites(source: string, code: string): MissingPathSite[] {
  const comparisons = listComparisons(source, code);
  const clones = listClones(code, comparisons);
  const inlineComparisons = comparisons.filter((comparison) =>
    clones.every((clone) => comparison.start < clone.start || comparison.end > clone.end),
  );
  const inlineSites = groupComparisons(code, inlineComparisons).map((group) => toInlineSite(code, group));

  return [...clones, ...inlineSites].toSorted((first, second) => first.start - second.start);
}

// region | Helpers

/** Reports whether a set of comparisons covers both missing-path codes. */
function coversBothCodes(comparisons: readonly Comparison[]): boolean {
  return new Set(comparisons.map((comparison) => comparison.code)).size === MISSING_PATH_CODES.length;
}

/**
 * Splits comparisons, in source order, into runs that test one operand and are joined by `||` or `&&` alone.
 * Parentheses around a comparison do not break a run.
 */
function groupComparisons(code: string, comparisons: readonly Comparison[]): Comparison[][] {
  const groups: Comparison[][] = [];
  for (const comparison of comparisons) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    const joins =
      previous !== undefined &&
      previous.operand === comparison.operand &&
      MERGE_SEPARATOR.test(code.slice(previous.end, comparison.start));

    if (group !== undefined && joins) group.push(comparison);
    else groups.push([comparison]);
  }
  return groups;
}

/**
 * Reports whether a function body consists of `return` statements and the `if` guards around them, and nothing
 * else. A guard's condition may nest parentheses.
 */
function isGuardedReturnBody(body: string): boolean {
  let text = body;
  for (let index = text.search(IF_HEAD); index !== -1; index = text.search(IF_HEAD)) {
    const condition = readBalancedGroup(text, index, PARENTHESES);
    if (condition === undefined) return false;
    text = `${text.slice(0, index)} ${text.slice(condition.end)}`;
  }

  const statements = condenseWhitespace(text)
    .replaceAll(/\belse\b/g, ' ')
    .replaceAll(/[{}]/g, ' ')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement !== '');

  return statements.length > 0 && statements.every((statement) => /^return\b/.test(statement));
}

/** Reports whether a literal's text is one of the missing-path codes. */
function isMissingPathCode(text: string | undefined): text is MissingPathCode {
  return MISSING_PATH_CODES.some((code) => code === text);
}

/** Reports whether an operand reads `code` off a parameter, directly or through a parenthesized cast. */
function isParameterCode(operand: string, parameter: string): boolean {
  const escaped = parameter.replaceAll('$', String.raw`\$`);
  return operand === `${parameter}.code` || new RegExp(String.raw`^\(\s*${escaped}(?![\w$])`).test(operand);
}

/** Lists the functions whose whole body tests their own first parameter against both missing-path codes. */
function listClones(code: string, comparisons: readonly Comparison[]): MissingPathSite[] {
  return listFunctionBodies(code).flatMap((fn): MissingPathSite[] => {
    const parameter = fn.firstParameter;
    if (parameter === undefined) return [];

    const inBody = comparisons.filter((comparison) => comparison.start >= fn.bodyStart && comparison.end <= fn.bodyEnd);
    const isClone =
      coversBothCodes(inBody) &&
      inBody.every((comparison) => isParameterCode(comparison.operand, parameter)) &&
      isGuardedReturnBody(code.slice(fn.bodyStart, fn.bodyEnd));

    return isClone
      ? [
          {
            end: fn.bodyEnd,
            kind: 'missing-path-clone',
            line: getLineAtOffset(code, fn.headStart),
            start: fn.headStart,
            symbol: fn.name,
          },
        ]
      : [];
  });
}

/** Lists every comparison of a `code` operand with a missing-path literal, written on either side. */
function listComparisons(source: string, code: string): Comparison[] {
  const comparisons: Comparison[] = [];
  for (const match of code.matchAll(BLANKED_LITERAL)) {
    const literal = readLiteral(source, match.indices?.[0]);
    if (!isMissingPathCode(literal)) continue;

    const literalStart = match.index;
    const literalEnd = literalStart + match[0].length;
    const comparison =
      readComparisonBefore(code, literalStart, literalEnd) ?? readComparisonAfter(code, literalStart, literalEnd);
    if (comparison !== undefined) comparisons.push({ ...comparison, code: literal });
  }
  return comparisons;
}

/** Returns the condensed text of an operand, with optional chaining read as plain member access. */
function normalizeOperand(text: string): string {
  return condenseWhitespace(text).replaceAll('?.', '.');
}

/** Reads a comparison whose `code` operand follows the literal, as in `'ENOENT' === error.code`. */
function readComparisonAfter(
  code: string,
  literalStart: number,
  literalEnd: number,
): Omit<Comparison, 'code'> | undefined {
  OPERATOR_AFTER.lastIndex = literalEnd;
  if (!OPERATOR_AFTER.test(code)) return undefined;
  const operandStart = OPERATOR_AFTER.lastIndex;

  let operandEnd: number | undefined;
  if (code[operandStart] === '(') {
    const group = readBalancedGroup(code, operandStart, PARENTHESES);
    if (group === undefined) return undefined;
    MEMBER_CODE_AFTER.lastIndex = group.end;
    if (MEMBER_CODE_AFTER.test(code)) operandEnd = MEMBER_CODE_AFTER.lastIndex;
  } else {
    CHAINED_CODE_AFTER.lastIndex = operandStart;
    if (CHAINED_CODE_AFTER.test(code)) operandEnd = CHAINED_CODE_AFTER.lastIndex;
  }

  if (operandEnd === undefined) return undefined;
  return { end: operandEnd, operand: normalizeOperand(code.slice(operandStart, operandEnd)), start: literalStart };
}

/** Reads a comparison whose `code` operand precedes the literal, as in `error.code === 'ENOENT'`. */
function readComparisonBefore(
  code: string,
  literalStart: number,
  literalEnd: number,
): Omit<Comparison, 'code'> | undefined {
  const operator = OPERATOR_BEFORE.exec(code.slice(0, literalStart));
  if (operator === null) return undefined;

  const operandEnd = code.slice(0, operator.index).trimEnd().length;
  const operandStart = readOperandStart(code, operandEnd);
  if (operandStart === undefined) return undefined;

  return { end: literalEnd, operand: normalizeOperand(code.slice(operandStart, operandEnd)), start: operandStart };
}

/** Returns the offset of the parenthesis that opens the group closed at an offset, scanning backward. */
function readOpeningParenthesis(code: string, close: number): number | undefined {
  let depth = 0;
  for (let index = close; index >= 0; index -= 1) {
    if (code[index] === ')') depth += 1;
    else if (code[index] === '(') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

/**
 * Returns where a `code` operand ending at an offset starts: a bare `code`, a member chain ending in `.code`, or
 * a parenthesized expression followed by `.code`. Returns nothing when the text there is not such an operand.
 */
function readOperandStart(code: string, end: number): number | undefined {
  const nameStart = end - 'code'.length;
  if (code.slice(nameStart, end) !== 'code') return undefined;

  let start = nameStart;
  if (code[start - 1] !== '.') return /[\w$.]/.test(code[start - 1] ?? '') ? undefined : start;

  start -= code[start - 2] === '?' ? 2 : 1;
  if (code[start - 1] === ')') return readOpeningParenthesis(code, start - 1);

  while (/[\w$.?]/.test(code[start - 1] ?? '')) start -= 1;
  while (code[start] === '.' || code[start] === '?') start += 1;
  return start < nameStart - 1 ? start : undefined;
}

/** Returns the site formed by a run of comparisons, which is partial when the run tests one code alone. */
function toInlineSite(code: string, group: readonly Comparison[]): MissingPathSite {
  const start = group[0]?.start ?? 0;
  const end = group.at(-1)?.end ?? start;
  const kind = coversBothCodes(group) ? 'missing-path-test' : 'missing-path-partial';
  return { end, kind, line: getLineAtOffset(code, start), start };
}

// endregion | Helpers
