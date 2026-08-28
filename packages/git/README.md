# @williamthorsen/toolbelt.git

Utilities for working with git.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.git
```

Requires Node.js 24 or later.

## `findBranchTicketRef`

```ts
findBranchTicketRef(branch: string, options?: { key?: string }): BranchTicketRef | undefined;

interface BranchTicketRef {
  readonly id: string;
  readonly key?: string | undefined;
  readonly number: number;
  readonly revisit?: number | undefined;
}
```

Finds the ticket a branch name encodes, or `undefined` when it encodes none.

```ts
import { findBranchTicketRef } from '@williamthorsen/toolbelt.git/candidate';

findBranchTicketRef('wt/MAC-22.1-add-widget');
// { id: 'MAC-22', key: 'MAC', number: 22, revisit: 1 }

findBranchTicketRef('232_add-widget');
// { id: '232', number: 232 }
```

A ref must begin a segment. `/` and `_` both delimit one, so an author prefix and a worktree-safe spelling parse alike, and the leftmost segment carrying a ref wins. Anchoring to a segment is what keeps a kebab-case description from reading as a ticket: `feat/add-widget-2` encodes none, because `widget` follows a hyphen rather than a separator.

Two forms are recognized, each taking an optional `.N` revisit suffix. A **keyed** ref is a Jira-style key and number, the key matching Jira's own rule of a letter followed by letters and digits. A **bare-numeric** ref is the number alone. `id` and `key` are emitted uppercased, since a branch name may be lowercase but the ticket it names is `MAC-22`.

By default a key must be uppercase, which is what Jira permits and the only property separating a real key from an ordinary word: without it, `feat-2` would read as ticket `FEAT-2`. Declaring the project's own key through `key` is both more permissive and more precise, since it then matches in any casing and is the only key that matches at all.

```ts
findBranchTicketRef('mac-22/add-widget');
// undefined -- a lowercase key with none declared

findBranchTicketRef('mac-22/add-widget', { key: 'mac' });
// { id: 'MAC-22', key: 'MAC', number: 22 }

findBranchTicketRef('feat-2', { key: 'mac' });
// undefined -- `feat` is not the declared key
```

The bare-numeric form stays active whether or not a key is declared. A `RangeError` names the fault when `key` is not a well-formed key, which would otherwise match nothing at all.

A trailing `-N` is not read as a sub-ID, being indistinguishable from a description: `232-3-column-layout` carries no revisit. Neither suffix affects `number`.

## `deriveBranchNumber`

```ts
deriveBranchNumber(branch: string, options?: { key?: string; max?: number; min?: number; offset?: number }): number;
```

Derives a number from a branch name, for a port offset, a bucket, or any slot that must stay stable across checkouts of the same branch.

```ts
import { deriveBranchNumber } from '@williamthorsen/toolbelt.git/candidate';

deriveBranchNumber('232_add-widget');
// 232

deriveBranchNumber('main');
// 663286764
```

The number is the ticket's when the branch names one, and a [`hashString`](https://github.com/williamthorsen/toolbelt/tree/main/packages/strings#hashstring) digest of the whole name when it does not, so every branch yields something. `min`, `max`, and `offset` are `hashString`'s, and apply to both paths alike: the two land in one range, and `offset` stays a pure rotation.

```ts
deriveBranchNumber('232_add-widget', { min: 3000, max: 3999 });
// 3232

deriveBranchNumber('refactor/tidy-imports', { min: 3000, max: 3999 });
// 3508
```

A number that overruns the range wraps into it, so `deriveBranchNumber('1232', { max: 999 })` is `232`. `key` is passed through to `findBranchTicketRef`, and a bad `key`, bound, or offset raises the same `RangeError` whether or not the branch names a ticket.
