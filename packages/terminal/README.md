<!-- readme-type: library -->

# @williamthorsen/toolbelt.terminal

Utilities for rendering command-line output to terminals, pipes, and CI logs.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.terminal
```

Requires Node.js 24 or later. The width functions wrap `wrap-ansi`, `cli-truncate`, `slice-ansi`, and `string-width`, which come to nine packages in all; npm scopes dependencies to the package rather than to the subpath, so a consumer installs them whichever subpath it imports.

Every export is candidate tier: imported from `@williamthorsen/toolbelt.terminal/candidate` rather than the package root, and subject to change. Each export's doc comment states its edge cases and examples.

```ts
import { resolveOutputStyle, STATUS_GLYPHS } from '@williamthorsen/toolbelt.terminal/candidate';

const { style } = resolveOutputStyle({ argv: process.argv.slice(2), env: process.env, isTty: process.stdout.isTTY === true });
console.log(`${STATUS_GLYPHS[style].passed.text} every check passed`);
```

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

Because a set is indexed by the style that `resolveOutputStyle` returns, selecting a variant needs no function.

| Variant | Accepts                                                                       | Width      |
| ------- | ----------------------------------------------------------------------------- | ---------- |
| rich    | one code point with `Emoji_Presentation=Yes`, outside the regional indicators | 2          |
| plain   | printable ASCII, U+0020 through U+007E                                        | its length |

Each rule admits only code points whose width is fixed. Every code point that the rich rule admits has `East_Asian_Width=Wide`, and every printable ASCII code point has `East_Asian_Width=Narrow`, so 2 and `.length` are the measured widths rather than assumed ones. The regional indicators are the one `Emoji_Presentation=Yes` range left out, each being narrow alone and occupying two cells only in the pair that forms a flag.

Each of ⚠️, ℹ️, and ⏭️ is refused as a code point plus U+FE0F; `STATUS_GLYPHS` uses 🟠 for `warning` in place of ⚠️. On the plain side `'→'` is refused as `East_Asian_Width=Ambiguous`, which measures one cell or two by locale, and `'✓'` is refused although it measures one everywhere, because a plain variant exists to survive a CI log, a `grep`, a screen reader, and a terminal with no emoji font, and `'✓'` survives none of the last. An empty plain variant is legal at width 0, which lets a name keep its column with no plain word.

The alternatives cover less. `figures` has had no release since 2024-03 and falls back to legacy Windows console glyphs rather than ASCII, and `log-symbols` offers four symbols fixed at import. Neither pairs a rich glyph with a plain one, and neither reports a width, so a caller measures with `measureWidth` or guesses.

## Width

A CLI laying out a line has to know how wide its text renders, which is not how long the string is: `✅` is one UTF-16 unit and two cells, `👨‍👩‍👧‍👦` is eleven units and two cells, and an ANSI escape is several units and none. Wrapping or cutting by length overflows the terminal on one input and splits a character in half on the next.

```ts
import { measureWidth, truncateToWidth, wrapToWidth } from '@williamthorsen/toolbelt.terminal/candidate';

const width = process.stdout.columns ?? 80;

console.log(truncateToWidth(commitSubject, { width: 72 }));
console.log(wrapToWidth(description, { indent: 4, width }));
```

Node measures no width of its own. `util.stripVTControlCharacters` removes the escapes, which leaves a length rather than a count of cells, and `String.prototype.length` counts UTF-16 units throughout. `wrap-ansi` and `cli-truncate` do measure, and what the two wrappers here add is what those libraries leave to a caller: collapsing whitespace and indenting for one, a single ellipsis convention for the other, and for both a guard against a width that a terminal never reports but that arithmetic produces.

Each function returns a result for such a width rather than throwing, and the two return different results.

| Width                    | `wrapToWidth`                            | `truncateToWidth`  |
| ------------------------ | ---------------------------------------- | ------------------ |
| zero, negative, or `NaN` | one column for content                   | `''`               |
| `Infinity`               | one line, the indent still applied       | the text unchanged |
| fractional               | the whole columns below it               | the same           |
| an indent at or above it | one column for content, the indent whole | takes no indent    |

Truncation exists to fit, and nothing fits in no columns. Wrapping reflows text instead of dropping it, and it already overflows for a word too wide to break, so a floor of one column discards nothing. An indent that reserves every column that the line has overflows by the columns that it reserves: The indent is left whole rather than clamped, because a caller printing its own prefix into those cells needs the count that it asked for.
