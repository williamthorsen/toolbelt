<!-- readme-type: library -->

# @williamthorsen/toolbelt.datetime

Date and time utilities.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.datetime
```

Requires Node.js 24 or later.

## Usage

```ts
import { formatRelativeTime } from '@williamthorsen/toolbelt.datetime/proposed';

formatRelativeTime('2026-11-19T12:00:00Z', Date.parse('2026-11-22T12:00:00Z'), { locale: 'en' }); // '3 days ago'
```

`formatRelativeTime` describes a time relative to `now` in the largest unit that the elapsed time reaches, such as "yesterday" or "in 2 hours". The caller passes `now` rather than the function reading the clock, so that one value renders a whole table and a test controls time.

The export is in the `/proposed` tier, and its shape may change in any release.
