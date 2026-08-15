import { findCommonIndent, findLineIndent, isBlankText } from '../internal/indent-rules.ts';
import { joinLines, splitLines } from '../internal/text-lines.ts';

/**
 * Removes the indentation shared by a template literal's lines, discarding the opening line and a
 * blank closing line that the surrounding source layout introduces.
 *
 * Interpolated values are spliced after the indent is measured, so no value can change how much
 * indentation is removed.
 *
 * @category String
 * @experimental
 * @stage candidate
 */
export const dedent: Dedent = createDedent({ valueIndentationStyle: 'none' });

/**
 * A `dedent` tag, together with the factory that derives a differently configured one from it.
 */
export interface Dedent {
  (templateStrings: TemplateStringsArray, ...values: DedentValue[]): string;
  withOptions(options: DedentOptions): Dedent;
}

export interface DedentOptions {
  /**
   * Whether a multi-line value's continuation lines are indented to match the line it opened on.
   * Defaults to `'none'`, which splices every value exactly as given.
   */
  valueIndentationStyle?: 'line' | 'none' | undefined;
}

/**
 * The values a template may interpolate. Objects are excluded because they would coerce to
 * `[object Object]`, and nullish values because they would silently render as `"null"`; both are
 * left for the caller to convert deliberately.
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
 * Splits the literals into lines, attributing each interpolation to the line it appears on.
 */
function buildTemplateLines(templateStrings: TemplateStringsArray): TemplateLine[] {
  const lines: TemplateLine[] = [];
  let segments: TemplateSegment[] = [];

  for (const [literalIndex, literal] of templateStrings.entries()) {
    for (const { terminator, text } of splitLines(literal)) {
      segments.push({ kind: 'literal', text });
      if (terminator !== '') {
        lines.push({ segments, terminator });
        segments = [];
      }
    }
    if (literalIndex < templateStrings.length - 1) {
      segments.push({ kind: 'value', valueIndex: literalIndex });
    }
  }
  lines.push({ segments, terminator: '' });

  return lines;
}

/**
 * Counts the line terminators a string contains.
 */
function countLineTerminators(text: string): number {
  return splitLines(text).length - 1;
}

function createDedent(options: ResolvedDedentOptions): Dedent {
  // Declared rather than assigned from an arrow so that `fn.name` is `dedent`, which is what
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
 * Reports whether a line holds no interpolation and nothing but whitespace.
 */
function isBlankLine(line: TemplateLine): boolean {
  return line.segments.every((segment) => segment.kind === 'literal' && isBlankText(segment.text));
}

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
 * Measures the indent the template's content lines share, rejecting a template whose lines are all
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
 * terminator, or a line continuation, would otherwise contribute a line the author never indented
 * and silently reduce the common indent to nothing.
 */
function validateEscapes(templateStrings: TemplateStringsArray): void {
  for (const [index, cooked] of templateStrings.entries()) {
    const raw = templateStrings.raw[index];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `TemplateStringsArray` is typed as holding strings, but a literal with an invalid escape cooks to `undefined` at runtime.
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
