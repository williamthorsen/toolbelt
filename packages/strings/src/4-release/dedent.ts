import { findCommonIndent, findLineIndent, isBlankText } from '../internal/indent-rules.ts';
import { joinLines, splitLines } from '../internal/text-lines.ts';

/**
 * Removes the indentation shared by a template literal's lines, discarding the opening line and a blank closing
 * line that the surrounding source layout introduces.
 *
 * Indentation is tabs and spaces only, compared as characters rather than as widths: A tab is never
 * interchangeable with any number of spaces, because no width is knowable from the text alone. When every line
 * is indented but the indentation disagrees in kind, the tag throws rather than removing nothing, because a
 * template that silently declines to dedent is the failure that this function exists to prevent. A template
 * with a genuine column-zero line strips nothing without complaint.
 *
 * Blank lines are ignored when measuring and emptied in the output, so an editor's trailing whitespace on an
 * otherwise empty line changes nothing. A line containing an interpolation counts as content even when the
 * rest of it is blank, so a value's position can affect the measurement even though its content cannot.
 *
 * Interpolated values are spliced after the indent is measured, so no value can change how much indentation is
 * removed.
 *
 * The tag reads the cooked strings, so an escaped backtick or `\t` behaves as it does in an ordinary template
 * literal. An escaped line terminator (`\n`, `\r`, `\u2028`, `\u2029`) or a backslash-newline line continuation
 * changes how many lines the literal spans, and the line that it adds would count as content at column zero and
 * silently flatten the whole template, so the tag throws rather than guessing. Interpolate such text as a value
 * instead.
 *
 * @example
 * dedent`
 *   before
 *   ${'x\ny'}
 *   after
 * `;
 * // 'before\nx\ny\nafter'
 *
 * @example
 * dedent`
 * \ttab-indented
 *     space-indented
 * `;
 * // Error: Every line of the template is indented, but they share no common indentation.
 *
 * @example
 * dedent`
 *   Error: bad input\nDetails: see log
 * `;
 * // Error: The template contains an escaped line terminator or a line continuation...
 *
 * @category String
 * @stage release
 */
export const dedent: Dedent = createDedent({ valueIndentationStyle: 'none' });

/**
 * A `dedent` tag, together with the factory that derives a differently configured one from it.
 */
export interface Dedent {
  (templateStrings: TemplateStringsArray, ...values: DedentValue[]): string;

  /**
   * Returns a new tag and leaves the receiver untouched, so configuring one call site cannot change behavior
   * at another. Successive calls merge over the receiver, and an explicit `undefined` inherits rather than
   * resets.
   */
  withOptions(options: DedentOptions): Dedent;
}

export interface DedentOptions {
  /**
   * Whether a multi-line value's continuation lines are indented to match the line on which it opened.
   * Defaults to `'none'`, which splices every value exactly as given.
   *
   * `'none'` is the default because indenting a value edits data that the caller did not ask to have edited:
   * A patch, a stack trace, or a base64 blob would come back subtly altered, and nothing in the output would
   * say so. A caller who wanted alignment and did not get it sees ragged output and can act on it.
   *
   * @example
   * const items = 'alpha\nbeta';
   *
   * dedent`
   *   Items:
   *     ${items}
   * `;
   * // 'Items:\n  alpha\nbeta'
   *
   * dedent.withOptions({ valueIndentationStyle: 'line' })`
   *   Items:
   *     ${items}
   * `;
   * // 'Items:\n  alpha\n  beta'
   */
  valueIndentationStyle?: 'line' | 'none' | undefined;
}

/**
 * The values that a template may interpolate. Objects are excluded because they would coerce to `[object Object]`,
 * and nullish values because they would silently render as `"null"`; both are left for the caller to convert
 * deliberately, as `${String(error)}` or `${value ?? ''}`, so that the reader can see the intent.
 *
 * `Date`, `Error`, and `URL` are excluded on the same grounds, although each has a meaningful `toString`.
 * Interpolate `String(value)`, or a field such as `error.message` or `url.href`.
 */
export type DedentValue = bigint | boolean | number | string;

// region | Helpers

interface ResolvedDedentOptions {
  valueIndentationStyle: 'line' | 'none';
}

interface TemplateLine {
  segments: TemplateSegment[];
  terminator: string;
}

type TemplateSegment = { kind: 'literal'; text: string } | { kind: 'value'; valueIndex: number };

/**
 * Splits the literals into lines, attributing each interpolation to the line on which it appears.
 */
function buildTemplateLines(templateStrings: TemplateStringsArray): TemplateLine[] {
  const lines: TemplateLine[] = [];
  let segments: TemplateSegment[] = [];

  for (const [literalIndex, literal] of templateStrings.entries()) {
    for (const { terminator, text } of splitLines(literal)) {
      segments.push({ kind: 'literal', text });
      if (terminator === '') {
        continue;
      }

      lines.push({ segments, terminator });
      segments = [];
    }
    if (literalIndex < templateStrings.length - 1) {
      segments.push({ kind: 'value', valueIndex: literalIndex });
    }
  }
  lines.push({ segments, terminator: '' });

  return lines;
}

/**
 * Counts the line terminators that a string contains.
 */
function countLineTerminators(text: string): number {
  return splitLines(text).length - 1;
}

/**
 * Creates a `dedent` tag bound to the given options.
 */
function createDedent(options: ResolvedDedentOptions): Dedent {
  // Declared rather than assigned from an arrow so that `fn.name` is `dedent`, which
  // `describe(dedent, ...)` reports as the suite name.
  function dedent(templateStrings: TemplateStringsArray, ...values: DedentValue[]): string {
    return renderTemplate(templateStrings, values, options);
  }

  // Merged field by field rather than by spreading, because under `exactOptionalPropertyTypes` an
  // explicit `undefined` in a spread would overwrite the receiver's value instead of inheriting it.
  dedent.withOptions = (overrides: DedentOptions): Dedent =>
    createDedent({
      valueIndentationStyle: overrides.valueIndentationStyle ?? options.valueIndentationStyle,
    });

  return dedent;
}

/**
 * Returns the literal text that opens a line, which is empty when the line opens with an
 * interpolation.
 */
function findLeadingLiteral(line: TemplateLine): string {
  const [firstSegment] = line.segments;
  return firstSegment?.kind === 'literal' ? firstSegment.text : '';
}

/**
 * Indents every line of a value after the first, leaving blank lines blank so that a value's
 * trailing newline does not push the text following it out of position.
 */
function indentContinuationLines(text: string, indent: string): string {
  if (indent === '') return text;

  return joinLines(
    splitLines(text).map((line, index) =>
      index === 0 || line.text === '' ? line : { ...line, text: indent + line.text },
    ),
  );
}

/**
 * Reports whether a line contains no interpolation and nothing but whitespace.
 */
function isBlankLine(line: TemplateLine): boolean {
  return line.segments.every((segment) => segment.kind === 'literal' && isBlankText(segment.text));
}

/**
 * Renders a template with its common indent removed and its values spliced in.
 */
function renderTemplate(
  templateStrings: TemplateStringsArray,
  values: ReadonlyArray<DedentValue>,
  options: ResolvedDedentOptions,
): string {
  validateEscapes(templateStrings);

  const lines = trimTemplateEdges(buildTemplateLines(templateStrings));
  const commonIndent = resolveCommonIndent(lines);

  const renderedLines = lines.map((line) => {
    if (isBlankLine(line)) return { terminator: line.terminator, text: '' };

    const leadingLiteral = findLeadingLiteral(line).slice(commonIndent.length);
    const valueIndent = options.valueIndentationStyle === 'line' ? findLineIndent(leadingLiteral) : '';

    let text = '';
    for (const [segmentIndex, segment] of line.segments.entries()) {
      if (segment.kind === 'literal') {
        text += segmentIndex === 0 ? leadingLiteral : segment.text;
      } else {
        text += indentContinuationLines(String(values[segment.valueIndex]), valueIndent);
      }
    }
    return { terminator: line.terminator, text };
  });

  return joinLines(renderedLines);
}

/**
 * Measures the indent shared by the template's content lines, rejecting a template whose lines are all
 * indented but agree on no common prefix -- stripping nothing there would silently do nothing.
 */
function resolveCommonIndent(lines: ReadonlyArray<TemplateLine>): string {
  const contentIndents = lines
    .filter((line) => !isBlankLine(line))
    .map((line) => findLineIndent(findLeadingLiteral(line)));
  const commonIndent = findCommonIndent(contentIndents);

  if (commonIndent === '' && contentIndents.length > 0 && contentIndents.every((indent) => indent !== '')) {
    throw new Error(
      'Every line of the template is indented, but they share no common indentation. Check for a mix of tabs and spaces.',
    );
  }

  return commonIndent;
}

/**
 * Drops the opening line, which the backtick's own newline creates, and a blank closing line
 * together with the terminator that separated it from the text.
 */
function trimTemplateEdges(lines: TemplateLine[]): TemplateLine[] {
  const [openingLine, ...rest] = lines;
  if (openingLine === undefined) return [];
  if (!isBlankLine(openingLine)) {
    throw new Error('The first line of the template must be empty.');
  }

  const closingLine = rest.at(-1);
  if (closingLine === undefined || !isBlankLine(closingLine)) return rest;

  const retained = rest.slice(0, -1);
  const lastRetained = retained.at(-1);
  return lastRetained === undefined ? [] : [...retained.slice(0, -1), { ...lastRetained, terminator: '' }];
}

/**
 * Rejects a literal whose cooked and raw forms disagree on how many lines it spans. An escaped line
 * terminator, or a line continuation, would otherwise contribute a line that the author never indented
 * and silently reduce the common indent to nothing.
 */
function validateEscapes(templateStrings: TemplateStringsArray): void {
  for (const [index, cooked] of templateStrings.entries()) {
    const raw = templateStrings.raw[index];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `TemplateStringsArray` is typed as containing strings, but a literal with an invalid escape cooks to `undefined` at runtime.
    if (cooked === undefined || raw === undefined) {
      throw new Error('The template contains an invalid escape sequence.');
    }
    if (countLineTerminators(cooked) !== countLineTerminators(raw)) {
      throw new Error(
        'The template contains an escaped line terminator or a line continuation, which would leave its indentation ambiguous. Interpolate the text as a value instead.',
      );
    }
  }
}

// endregion | Helpers
