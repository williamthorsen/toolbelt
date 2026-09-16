<!-- readme-type: library -->

# @williamthorsen/toolbelt.terminal

Utilities for rendering command-line output to terminals, pipes, and CI logs.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.terminal
```

Requires Node.js 24 or later. The width functions wrap `wrap-ansi`, `cli-truncate`, `slice-ansi`, and `string-width`, which come to nine packages in all; npm scopes dependencies to the package rather than to the subpath, so a consumer installs them whichever subpath it imports.

## Output style

A CLI that prints glyphs has to choose between rich output for a person's terminal and plain output for pipes and CI logs. The package resolves that choice from the invocation, a standing preference, and the environment.

```ts
import { resolveOutputStyle } from '@williamthorsen/toolbelt.terminal/candidate';

const { style } = resolveOutputStyle({
  argv: process.argv.slice(2),
  env: process.env,
  envVar: 'MYCLI_STYLE',
  flag: '--style',
  isTty: process.stdout.isTTY === true,
});
```

Nothing here reads `process`: argv, the environment, and the stream's TTY state are all arguments. A CLI writing its status to stderr passes `process.stderr.isTTY` instead.

The known alternatives decide from the ambient environment, none accepts an injected one, and each disagrees with the rule above on some input. `is-in-ci` counts `CI=''` as CI. `std-env` honours `CI=false` on its own, but overrides it wherever a provider variable such as `GITHUB_ACTIONS` is set, so a run that denies CI is reported as one anyway. `is-unicode-supported` reads neither `CI` nor TTY state, though it agrees with this package that `TERM=linux` rules out Unicode.

## `resolveOutputStyle`

```ts
resolveOutputStyle(options: {
  argv: readonly string[];
  env: Readonly<Record<string, string | undefined>>;
  envVar?: string;
  flag?: string;
  isTty: boolean;
}): { style: 'plain' | 'rich'; invalid?: { source: string; value: string } };
```

Resolves the style from the flag, else the environment variable, else detection. Each source accepts `auto`, `plain`, or `rich`, and `auto` defers to detection.

`flag` and `envVar` are the caller's own names. Omitting one drops that source from the chain, so a CLI may offer a flag, an environment variable, both, or neither.

```ts
resolveOutputStyle({ argv: ['--style', 'plain'], env: {}, flag: '--style', isTty: true });
// { style: 'plain' }
```

The flag is read from raw argv ahead of any parse, which lets a CLI render its own parse failure in the style that the invocation asked for. Because the same argv then reaches `parseArgs`, the scan reads it the way `parseArgs` does: `--style plain` and `--style=plain` both give a value, the `--` terminator ends the scan, and the last occurrence wins. A dash-led argument after a spaced flag is no value, `-` alone excepted, so `--style --verbose` leaves the flag contributing nothing and lets `parseArgs` raise the ambiguity itself. A value of `''` from either source reads as absent, so an unset-looking export does not shadow detection.

A value naming no setting is reported rather than thrown, because the caller has to render its complaint in some style and a resolver that threw would leave it none. Resolution continues to the next source, and the first rejected value is the one kept.

```ts
resolveOutputStyle({ argv: ['--style=fancy'], env: {}, flag: '--style', isTty: true });
// { invalid: { source: '--style', value: 'fancy' }, style: 'rich' }
```

## `describeInvalidOutputStyle`

```ts
describeInvalidOutputStyle(invalid: { source: string; value: string }): string;
```

Composes the usage message for a rejected value, so that every CLI reports one in the same words.

```ts
describeInvalidOutputStyle({ source: '--style', value: 'fancy' });
// '--style must be one of: auto, plain, rich (got "fancy")'
```

## `detectOutputStyle`

```ts
detectOutputStyle(options: { env: Readonly<Record<string, string | undefined>>; isTty: boolean }): 'plain' | 'rich';
```

Detects the style that an environment calls for. `resolveOutputStyle` falls back to it, and a CLI offering neither a flag nor an environment variable calls it directly.

Rich requires all three signals to allow it, and anything else gives plain.

| Signal    | Rich requires                                               |
| --------- | ----------------------------------------------------------- |
| `CI`      | unset, `''`, or `'false'`, the two denials matching exactly |
| TTY state | the stream is a terminal                                    |
| `TERM`    | anything but `linux`                                        |

Each signal catches what the others miss. `CI` catches a runner that allocates a pseudo-terminal, where the TTY check alone would emit emoji into a log that nobody can grep, and `CI` is not universal either, since Jenkins does not set it. The TTY check catches an interactive pipe into `grep`. `TERM=linux` catches the Linux virtual console, a terminal outside CI whose kernel font draws no emoji at all.

`TERM=dumb` and `NO_COLOR` are not read. Each reports absent colour rather than absent Unicode, and a caller wanting plain output under either sets the flag or the environment variable.

## Glyphs

A CLI printing a status glyph has to know how many cells it takes, or its columns drift. Terminals disagree on the width of an emoji written with a U+FE0F variation selector (⚠️, ⏭️), so a glyph set accepts neither. A set declares the text of each variant and nothing else, deriving every width from the rules that it enforces.

```ts
import { measureGlyphColumn, resolveOutputStyle, STATUS_GLYPHS } from '@williamthorsen/toolbelt.terminal/candidate';

const { style } = resolveOutputStyle({ argv, env, flag: '--style', isTty });
const glyphs = STATUS_GLYPHS[style];
const gutter = measureGlyphColumn(glyphs) + 1;

const { text, width } = glyphs.passed;
console.log(text + ' '.repeat(gutter - width) + 'every check passed');
// rich:  ✅ every check passed
// plain: PASS  every check passed
```

A set is indexed by the style that `resolveOutputStyle` returns, so selecting a variant needs no function.

| Variant | Accepts                                                                       | Width      |
| ------- | ----------------------------------------------------------------------------- | ---------- |
| rich    | one code point with `Emoji_Presentation=Yes`, outside the regional indicators | 2          |
| plain   | printable ASCII, U+0020 through U+007E                                        | its length |

Each rule is drawn where the width stops being a guess. Every code point that the rich rule admits carries `East_Asian_Width=Wide`, and every printable ASCII code point carries `East_Asian_Width=Narrow`, so 2 and `.length` are the measured widths rather than assumed ones. The regional indicators are the one `Emoji_Presentation=Yes` range left out, each being narrow alone and reaching two cells only in the pair that forms a flag.

⚠️, ℹ️, and ⏭️ are each a code point plus U+FE0F, so each is refused; `STATUS_GLYPHS` carries 🟠 for `warning` in place of ⚠️. On the plain side `'→'` is refused as `East_Asian_Width=Ambiguous`, which measures one cell or two by locale, and `'✓'` is refused although it measures one everywhere, because a plain variant exists to survive a CI log, a `grep`, a screen reader, and a terminal with no emoji font, and `'✓'` survives none of the last. An empty plain variant is legal at width 0, which lets a name hold its column with no plain word.

The alternatives cover less. `figures` has had no release since 2024-03 and falls back to legacy Windows console glyphs rather than ASCII, and `log-symbols` offers four symbols fixed at import. Neither pairs a rich glyph with a plain one, and neither reports a width, so a caller measures with `measureWidth` or guesses.

## `defineGlyphSet`

```ts
defineGlyphSet<Name extends string>(variants: Readonly<Record<Name, GlyphVariants>>): GlyphSet<Name>;
```

Assembles a set, throwing a `TypeError` that names every violation at once rather than stopping at the first. It throws where `resolveOutputStyle` reports, because a set is built from the author's own literals at module load and a violation there is a programming error.

```ts
const SOURCE_GLYPHS = defineGlyphSet({
  directory: { plain: 'DIR', rich: '📁' },
  package: { plain: 'PKG', rich: '📦' },
  remote: { plain: 'NET', rich: '🌐' },
});

SOURCE_GLYPHS.rich.package; // { text: '📦', width: 2 }
SOURCE_GLYPHS.plain.package; // { text: 'PKG', width: 3 }
```

## `measureGlyphColumn`

```ts
measureGlyphColumn(glyphs: Readonly<Record<string, Glyph>>): number;
```

Reports the widest glyph in one style's record, which is the column width that aligns every one of them. It takes the record rather than a set and a style, so a caller passes what indexing already gave it. Deriving the width removes the hardcoded per-style constant that a CLI otherwise carries: adding a status with a longer plain word then widens the column on its own.

## `STATUS_GLYPHS`

| Name      | Rich | Plain   |
| --------- | ---- | ------- |
| `blocked` | 🚫   | `BLOCK` |
| `failed`  | ❌   | `FAIL`  |
| `info`    | 🔵   | `INFO`  |
| `passed`  | ✅   | `PASS`  |
| `skipped` | ⏩   | `SKIP`  |
| `warning` | 🟠   | `WARN`  |

The plain column measures 5 cells and the rich column measures 2. The outcomes that a reader acts on are told apart by shape rather than by hue, so ✅, ❌, ⏩, and 🚫 stay distinct for a reader with red-green colour blindness; the two remaining circles carry `info` and `warning`, whose blue and orange separate on the axis that such a reader keeps.

## Width

A CLI laying out a line has to know how wide its text renders, which is not how long the string is: `✅` is one UTF-16 unit and two cells, `👨‍👩‍👧‍👦` is eleven units and two cells, and an ANSI escape is several units and none. Wrapping or cutting by length overflows the terminal on one input and splits a character in half on the next.

```ts
import { measureWidth, truncateToWidth, wrapToWidth } from '@williamthorsen/toolbelt.terminal/candidate';

const width = process.stdout.columns ?? 80;

console.log(truncateToWidth(commitSubject, { width: 72 }));
console.log(wrapToWidth(description, { indent: 4, width }));
```

Node measures no width of its own. `util.stripVTControlCharacters` removes the escapes, which leaves a length rather than a count of cells, and `String.prototype.length` counts UTF-16 units throughout. `wrap-ansi` and `cli-truncate` do measure, and what the two wrappers here add is what those libraries leave to a caller: collapsing whitespace and indenting for one, a single ellipsis convention for the other, and for both a guard against a width that no terminal reports but that arithmetic produces.

Such a width is answered rather than thrown, and the two functions answer differently.

| Width                    | `wrapToWidth`                            | `truncateToWidth`  |
| ------------------------ | ---------------------------------------- | ------------------ |
| zero, negative, or `NaN` | one column for content                   | `''`               |
| `Infinity`               | one line, the indent still applied       | the text unchanged |
| fractional               | the whole columns below it               | the same           |
| an indent at or above it | one column for content, the indent whole | takes no indent    |

Truncation exists to fit, and nothing fits in no columns. Wrapping reflows text instead of dropping it, and it already overflows for a word too wide to break, so a floor of one column costs it nothing. An indent that reserves every column that the line has overflows by the columns that it reserves: the indent is left whole rather than clamped, because a caller printing its own prefix into those cells needs the count that it asked for.

## `measureWidth`

```ts
measureWidth(text: string): number;
```

Reports the terminal cells that text occupies.

```ts
measureWidth('漢字'); // 4
measureWidth('👨‍👩‍👧‍👦'); // 2
measureWidth('\u{1B}[31mred\u{1B}[39m'); // 3
```

An ambiguous-width character such as `→` counts as one cell. That is a reading rather than a fact, since a CJK-locale terminal draws it as two, and it is the same disagreement for which `defineGlyphSet` refuses `→` in a plain glyph.

## `wrapToWidth`

```ts
wrapToWidth(text: string, options: { hanging?: boolean; indent?: number; width: number }): string;
```

Collapses whitespace and wraps greedily to a width, returning the lines joined by `\n`.

`indent` reserves its columns inside `width` rather than adding to them, so `width` is a line's full rendered width and a caller passes the terminal's own.

```ts
wrapToWidth('one two three four five', { indent: 4, width: 14 });
// '    one two\n    three four\n    five'
```

`hanging` leaves the first line's reserved columns bare while narrowing it just the same, which is the shape a table needs: the row prefix fills those cells, and the continuations line up beneath it.

```ts
const indent = measureWidth(prefix);
const [first = '', ...rest] = wrapToWidth(description, { hanging: true, indent, width }).split('\n');

console.log(prefix + first);
for (const line of rest) console.log(line);
```

Wrapping is soft. A word wider than the content width stays whole on its own line and overflows, which is one of the two cases in which a line measures more than `width`; the other is the indent in the table above. Whitespace collapses unconditionally, line breaks included, so text whose line structure carries meaning is wrapped one paragraph at a time.

## `truncateToWidth`

```ts
truncateToWidth(text: string, options: { ellipsis?: string; width: number }): string;
```

Truncates text at the end to a width, counting the ellipsis inside that width rather than beyond it.

```ts
truncateToWidth('abcdefgh', { width: 5 }); // 'abcd…'
truncateToWidth('abcdefgh', { ellipsis: '...', width: 5 }); // 'ab...'
```

The ellipsis defaults to `…`, one cell wide. An ellipsis too wide for the width is dropped and the width is filled with text instead, which is the one input on which `cli-truncate` renders wider than it was asked.

```ts
truncateToWidth('abcdefgh', { ellipsis: '...', width: 2 }); // 'ab'
```

The text is expected to hold no line break, which occupies no columns and would leave the result laid out across lines that the width says nothing about.
