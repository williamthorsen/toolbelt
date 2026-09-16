<!-- readme-type: library -->

# @williamthorsen/toolbelt.terminal

Utilities for rendering command-line output to terminals, pipes, and CI logs.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.terminal
```

Requires Node.js 24 or later.

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

The known alternatives decide from the ambient environment and disagree on the rule. `std-env` counts `CI=false` as CI, `is-in-ci` counts `CI=''` as CI, and neither accepts an injected environment. `is-unicode-supported` reads neither `CI` nor TTY state, though it agrees with this package that `TERM=linux` rules out Unicode.

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

The flag is read from raw argv ahead of any parse, which lets a CLI render its own parse failure in the style that the invocation asked for. The scan accepts `--style plain` and `--style=plain`, stops at the `--` terminator, keeps the last occurrence, and takes the argument after a spaced flag whatever it holds; all four match what `parseArgs` resolves. A value of `''` from either source reads as absent, so an unset-looking export does not shadow detection.

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
