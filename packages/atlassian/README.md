# @williamthorsen/toolbelt.atlassian

Utilities for working with Atlassian Cloud.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.atlassian
```

Requires Node.js 24 or later.

## Scope

Jira, Confluence, and Bitbucket Cloud. One Atlassian account API token authenticates all three, so credential resolution, the Basic auth transport, and the cloudId lookup are shared here rather than duplicated across a package per product.

## Status

The package is scaffolded and exports nothing yet. Its first exports arrive with [#267](https://github.com/williamthorsen/toolbelt/issues/267).
