# @williamthorsen/toolbelt.strings

String-handling utilities.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.strings
```

Requires Node.js 24 or later.

`dedent` and `stripCommonIndent` are candidate tier: imported from `@williamthorsen/toolbelt.strings/candidate` rather than the package root, and subject to change.

## `dedent`

```ts
dedent`...`;
dedent.withOptions(options: { valueIndentationStyle?: 'none' | 'line' }): Dedent;
```

Removes the indentation a multi-line template literal inherits from the source it is written in, so the string a reader sees is the string the program gets.

```ts
import { dedent } from '@williamthorsen/toolbelt.strings/candidate';

function describeNpc() {
  return dedent`
    You are assisting the Game Master of a roleplaying game.
    Create an ordinary, everyday person in a high-fantasy setting.
  `;
}
// 'You are assisting the Game Master of a roleplaying game.\nCreate an ordinary, everyday person in a high-fantasy setting.'
```

The opening line is discarded, and so is the closing line when it holds nothing but whitespace. A closing line carrying text is kept and dedented along with the rest, where `String.dedent` throws.

Dropping the closing line takes with it the terminator that preceded it, so text on the last line comes back without a trailing newline. Where one is wanted, leave a blank line above the closing backtick: a blank line is emptied rather than discarded, and the terminator above it survives.

```ts
dedent`
  alpha

`;
// 'alpha\n'
```

Relative depth is preserved. What is removed is the longest indentation every content line shares.

```ts
dedent`
  outer
    inner
  outer
`;
// 'outer\n  inner\nouter'
```

### What counts as indentation

Only tabs and spaces, and they are compared as characters rather than as widths. A tab is never interchangeable with any number of spaces, because no width is knowable from the text alone.

A consequence worth knowing before it surprises you: where every line is indented but the indentation disagrees in kind, the tag throws rather than removing nothing.

```ts
dedent`
	tab-indented
        space-indented
`;
// Error: Every line of the template is indented, but they share no common indentation.
```

Removing nothing would be silent, and a template that silently declines to dedent is the failure this function exists to prevent. A template with a genuine column-zero line is a different case, and strips nothing without complaint.

Blank lines are ignored when measuring and emptied in the output, so an editor's trailing whitespace on an otherwise empty line changes nothing. A line holding an interpolation counts as content even when the rest of it is blank, which means a value's **position** can affect the measurement even though its **content** cannot.

### Interpolated values

Values are spliced after the indentation is measured. Nothing a value contains can change how much indentation is removed:

```ts
const block = 'x\ny';
dedent`
  before
  ${block}
  after
`;
// 'before\nx\ny\nafter'
```

By default a value is spliced exactly as given, so a multi-line value's later lines land where its own text puts them. `valueIndentationStyle: 'line'` indents them to match the line the value opened on:

```ts
const items = 'alpha\nbeta';

dedent`
  Items:
    ${items}
`;
// 'Items:\n  alpha\nbeta'

dedent.withOptions({ valueIndentationStyle: 'line' })`
  Items:
    ${items}
`;
// 'Items:\n  alpha\n  beta'
```

`'none'` is the default because indenting a value edits data the caller did not ask to have edited. A patch, a stack trace, or a base64 blob comes back subtly altered, and nothing in the output says so. The other way round, a caller who wanted alignment sees ragged output and can act on it.

`withOptions` returns a new tag and leaves the receiver untouched, so configuring one call site cannot change behavior at another. Successive calls merge over the receiver, and an explicit `undefined` inherits rather than resets.

Interpolated values are limited to strings, numbers, bigints, and booleans. Objects are rejected at compile time because they would coerce to `[object Object]`, and `null` and `undefined` because they would render as the text `"null"` and `"undefined"`. Convert deliberately -- `${String(error)}`, `${value ?? ''}` -- so the reader can see what was intended.

Migrating from `unindent`: a nullish value used to render as the empty string, so `${maybeMissing}` worked as an idiom for optional content. It is now a compile error, which is where to look first if a template stops typechecking. `Date`, `Error`, and `URL` are rejected on the same grounds, even though each has a meaningful `toString`; interpolate `String(value)` or the field you actually meant.

### Escaped line terminators

The tag reads the cooked strings, so an escaped backtick or `\t` behaves exactly as it does in an ordinary template literal. An escaped **line terminator** is different: `\n`, `\r`, `\u2028`, and a backslash-newline line continuation each change how many lines the literal spans, leaving the author's indentation ambiguous. The tag throws rather than guessing.

```ts
dedent`
  Error: bad input\nDetails: see log
`;
// Error: The template contains an escaped line terminator or a line continuation...
```

Interpolate the text as a value instead. Without this check, the second line would count as content at column zero and silently flatten the whole template -- the same failure as a multi-line value, arriving through the literal.

## `stripCommonIndent`

```ts
stripCommonIndent(text: string): string;
```

Removes the indentation shared by every non-blank line of a string that already exists. This is the plain-function counterpart to `dedent`, for text that arrives at runtime rather than being written in source.

```ts
import { stripCommonIndent } from '@williamthorsen/toolbelt.strings/candidate';

stripCommonIndent(await readFile('prompt.txt', 'utf8'));
```

It performs none of the tag's edge handling. A template literal's opening newline is an artifact of the syntax; a runtime string has no such artifact, so no line is discarded and nothing is trimmed. A file's terminating newline survives, which is the point:

```ts
stripCommonIndent('  key: value\n  other: thing\n');
// 'key: value\nother: thing\n'
```

The indentation rules are the tag's: tabs and spaces only, compared as characters, with blank lines ignored when measuring and emptied in the output. That emptying is the one way this function edits a line beyond de-indenting it.

Line terminators are recognized as `\r\n`, `\n`, `\r`, `\u2028`, and `\u2029`, and each is re-emitted unchanged, so CRLF text does not come back with mixed endings.

A leading byte-order mark is held aside while the indentation is measured and restored afterwards. Without that, a file read with a BOM would have a first line starting with no tab or space, the common indentation would be nothing, and the call would silently do nothing at all.

Unlike the tag, this function never throws. It has no author's intent to check against.

## Relationship to `String.dedent`

[`String.dedent`](https://github.com/tc39/proposal-string-dedent) has been a TC39 stage 2 proposal since June 2022, with its stage 3 checklist still open and no champion since PayPal left the committee. No engine ships it. This implementation adopts the parts of it that are settled and diverges where it has reason to:

|                          | Here                                      | `String.dedent`                           |
| ------------------------ | ----------------------------------------- | ----------------------------------------- |
| Common indentation       | longest exactly-matching prefix           | same                                      |
| Blank lines              | ignored when measuring, emptied in output | proposal issue #23, open                  |
| Opening line             | whitespace-only accepted                  | must be a bare newline, else throws       |
| Closing line             | dropped only when whitespace-only         | throws when it carries text               |
| Escaped line terminators | throws                                    | dedents the raw strings and re-cooks them |
| Value indentation        | opt-in via `valueIndentationStyle`        | none; declined in proposal issue #88      |

The two lenient edge rules are deliberate. Requiring a bare opening line would reject invisible trailing whitespace after the backtick, which no formatter shows and every editor tolerates; throwing on a closing line that carries text would reject `` dedent`\n  a\n  b` ``, which is a reasonable thing to write.
