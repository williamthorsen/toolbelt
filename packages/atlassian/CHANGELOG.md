# Changelog

All notable changes to this project will be documented in this file.

## 0.5.2 — 2026-10-09

### 📦 Dependencies

- Bumped `@williamthorsen/toolbelt.cli` to 0.4.0
- Bumped `@williamthorsen/toolbelt.secrets` to 0.4.2

## 0.5.1 — 2026-10-07

### 📦 Dependencies

- Bumped `@williamthorsen/toolbelt.cli` to 0.3.0
- Bumped `@williamthorsen/toolbelt.secrets` to 0.4.1

## 0.5.0 — 2026-10-06

### 🎉 Features

- Moves the argument parsing, dispatch, and help of `tb-git`, `tb-jira`, `tb-node`, and `tb-secret` to `@williamthorsen/toolbelt.cli`, which generates each command's help from its schema and reports a usage error as `Error: <message>`, followed by a `Did you mean` line for a mistyped command and a pointer to that command's `--help`. (#365)
- Adds `-V` to `tb-git`, `tb-jira`, `tb-node`, and `tb-secret` as a short form of `--version`. (#365)

## 0.4.0 — 2026-10-02

### 🎉 Features

- Adds the `tb-jira issue list` subcommand, which prints a project's work items newest first, one line each with key, status, and summary, filtered by `--state` (`open` by default, `closed`, or `all`) and capped by `--limit` or `-L` (20 by default). (#357)
- Adds an optional `projectKey` field to `jira-project-spec.json`, from which `tb-jira issue list` and `tb-jira configure-project` take the project key when `--project` or the positional key is absent. (#357)
- Adds `listIssueSummaries` to the `/candidate` entry point of `@williamthorsen/toolbelt.atlassian`, which returns up to a given number of work items matched by a JQL query, each as `{ key, status, summary }`, following Jira's pages past 100 results. (#357)
- Adds `JiraResponseError` to `@williamthorsen/toolbelt.atlassian/candidate`, which the package's read functions throw in place of a plain `Error` when a 2xx response does not have the shape that they read, and which exposes the response's `url` as a field. (#358)

### 🐛 Bug fixes

- Fixes the issue that `tb-jira` reported a Jira response that it could not read as a usage error, exiting `2` with a `--help` pointer; it now exits `4` and prints the message with the URL that returned the response. (#358)
- Fixes the issue that the read functions in `@williamthorsen/toolbelt.atlassian/candidate` read a missing list field as an empty list, which made a search response without `issues` list nothing and a workflow response without `workflows` report a project on 0 workflows. (#358)
- Fixes the issue that `applyWorkflowUpdate` read a status read-back without a `values` array as an empty list and wrote every status update again; it now throws `JiraResponseError` instead. (#358)

### 📚 Documentation

- Audits the comments in every authored TypeScript, JavaScript, shell, and YAML source and every `tsconfig*.json` against the comment discipline, cutting comments that paraphrase the code or narrate history, rewriting doc descriptions in the third-person indicative, and adding descriptions to the functions, methods, and classes that had none. (#353)
- Revises READMEs, doc comments, and test names across the repository to follow the current `plain-speech` and writing-preference rules. (#354)
- Rewords the help text and messages printed by `tb-jira`, `tb-node`, and `tb-secret`, and the advice and skip reasons reported by the adoption kits, to follow the same writing conventions. (#354)

## 0.3.1 — 2026-09-17

### 🐛 Bug fixes

- Align every labelled line of tb-jira output in one column (#338)

  - Widens the label field from nine columns to ten on every labelled line, which moves the text of lines that were already aligned one column to the right.

## 0.3.0 — 2026-09-15

### 🎉 Features

- 🚨 **Breaking:** Move createTempTree from toolbelt.filesystem to toolbelt.testing (#313)

  - Moves `CreateTempTreeOptions` and the `TempTree` handle to `@williamthorsen/toolbelt.testing/candidate` along with `createTempTree`.

  Migration: Import `createTempTree`, `CreateTempTreeOptions`, and `TempTree` from `@williamthorsen/toolbelt.testing/candidate`, and declare `@williamthorsen/toolbelt.testing` in the manifest that declared `@williamthorsen/toolbelt.filesystem` for them.

### ⚙️ Tooling

- Remove the stale repo-local cliff.toml and normalize changelog titles (#327)

  - Stops `release-kit prepare` from printing a "skipped due to grouping error(s)" warning for each releasable workspace by letting it resolve the git-cliff template bundled with release-kit, previously overridden by the root `cliff.toml`.
  - Excludes commits without a ticket prefix from future changelog entries.
  - Renames the section titles in every `packages/*/.meta/changelog.json`, except `Dependency updates`, to the headings of release-kit's work-type taxonomy, such as "🎉 Features" and "🏗️ Internal features", and regenerates each `CHANGELOG.md` so that release-kit orders existing and new sections by the same rule.
  - Causes the next `release-kit prepare` to plan patch releases of `dstructs`, `hof`, and `sets`, which had no other commits since their last release, because the changelog commit touches every workspace.

### 📚 Documentation

- Align prose with plain-speech doctrine and writing conventions (#306)

  - Copy-edits prose across the repo: comments, test names, package READMEs, and `AGENTS.md`.
  - Rewrites a few user-facing strings as well, among them `configure-project`'s help text and the errors from `parseProjectSpec`, `securityCommands`, and `hashString`.

## 0.2.0 — 2026-09-06

### 🎉 Features

- Add Jira gateway URL resolution, Basic auth, and credential chains (#285)

  Adds Jira access to `@williamthorsen/toolbelt.atlassian`. `resolveJiraBaseUrl`, `createTokenTransport`, `resolveJiraEmail`, and `resolveJiraToken`, which together compose an authenticated request against a scoped Atlassian API token, are now exported at the candidate tier.

- Add the planning layer for reconciling a Jira project to a spec (#286)

  Adds a planning layer to `@williamthorsen/toolbelt.atlassian/candidate` for reconciling a Jira project against a spec that declares the statuses and board features the project should have. It validates the spec, resolves it against the project's live configuration into the changes a run would apply, and composes the body Jira's workflow-update endpoint takes.

- Add the Jira API functions with fail-closed project refusals (#288)

  - Adds `readProjectConfiguration`, which reads a project's statuses, workflow, board, and board features.
  - Adds `applyWorkflowUpdate` and `applyBoardFeatures`, which write a reconciliation plan back to Jira.
  - Adds `buildVerificationReport`, which checks a write by comparing a freshly read configuration against the spec.
  - Adds `readBoardColumnReport`, which reports the spec statuses that have no board column and any difference in column order.

- Ship the tb-jira CLI and document toolbelt.atlassian (#295)

  - Adds the `tb-jira` binary to `@williamthorsen/toolbelt.atlassian`: Its `configure-project` subcommand reconciles a Jira project's statuses, workflow transitions, and board features against a spec file owned by the consuming repo, and `--dry-run` prints the plan and writes nothing.
  - Adds a `tb-jira auth` subcommand, which stores, replaces, and removes the Jira API token in the keychain and reports which source would supply it without printing the token.
  - Adds `resolveJiraSite`, `findJiraTokenSource`, and `JiraTransportError` to `@williamthorsen/toolbelt.atlassian/candidate`, so library code can resolve the site, name which link of the token chain would answer without reading the token, and tell a request that Jira rejected from one that never reached Jira.
  - Adds `promptSecret` and `UnstorableSecretError` to `@williamthorsen/toolbelt.secrets/candidate`, so a caller outside that package can prompt for a secret without echoing it and can tell a token refused by the keychain from a keychain that could not be reached.

- 🚨 **Breaking:** Classify a rejected Jira request and carry the request URL into the error (#300)

  - Adds `reason` to `JiraRequestError`, naming the rejection as a scope shortfall, a rejected credential, a missing Jira permission, or an absent resource, avoiding the need to parse this information from the status and the body.
  - Adds `url` to `JiraResponse` and `JiraRequestError`, the request's full address.

  Migration: Return a `url` from any hand-written implementation of `JiraRequest`, since the field is required. Code using `createTokenTransport` needs no edit.

### 🐛 Bug fixes

- Point every package bin at a committed wrapper (#296)

  - Points the `tb-git`, `tb-jira`, and `tb-secret` commands at committed wrappers under each package's `bin/`, so the target exists when the package manager links the command rather than only after a build.

- Fix piped-stdin reads and unhandled EPIPE in the CLIs (#301)

  - Fixes an issue where `tb-secret set` and `tb-jira auth set` failed with `EAGAIN: resource temporarily unavailable` when the producer of a piped credential delayed its first byte, as `tb-secret get`, `op read`, and `gh auth token` all do.
  - Stops `tb-secret`, `tb-jira`, and `tb-git` from crashing with an unhandled `EPIPE` when the reader on their stdout or stderr exits first, so that `tb-secret get | head -1` ends quietly, as a program that ignores `SIGPIPE` does.

- Correct and document the backlog seed's plan line and printed undo (#302)

  - Stops `tb-jira configure-project --seed-backlog` from reporting `no changes: the project already matches the spec` while planning to move work items off the board.
  - Corrects the undo that `--seed-backlog` prints, which failed after a seed of more than 50 keys by posting them all in one call to an endpoint that accepts 50.

### 🏗️ Internal features

- Rename toolbelt.jira to toolbelt.atlassian (#273)

  Renames the `jira` package to `atlassian`: `packages/jira/` becomes `packages/atlassian/`, the published name becomes `@williamthorsen/toolbelt.atlassian`, and `scope:jira` becomes `scope:atlassian`.

### 🧪 Tests

- Audit the published package shape and record the scaffolding procedure (#274)

  Reduces the placeholder test in the template workspace to a marker, and adds two root-level tests verifying that every published package has the manifest fields, the documentation, and the registration entries that a scaffolded clone must produce.

  Also adds descriptions of the scaffolding procedure to AGENTS.md and the template workspace's README.md.

### 📚 Documentation

- Repair the repository's prose and record every rejection's ground (#290)

  Applies one repo-wide `revise-prose` sweep across the repository's READMEs, `AGENTS.md`, source comments, doc descriptions, and test names.

- Document the token scopes each reconciler endpoint needs (#298)

  - Replaces the `Token scopes` placeholder in `packages/atlassian/README.md`, which told a reader to over-grant, with the 23 granular scopes that a scoped Jira API token needs.
  - Adds a `Diagnosing a rejected request` section, since a missing scope reports `401` rather than `403` and a request carrying no credential reports `404` naming the project as not found.

- Restore relativizers across atlassian, secrets, and the workflows (#304)

  - Revises documentation and comments to align with plain-speech doctrine and writing conventions.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
