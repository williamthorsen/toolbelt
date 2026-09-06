# Changelog

All notable changes to this project will be documented in this file.

## 0.2.0 — 2026-09-06

### Features

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

### Bug fixes

- Point every package bin at a committed wrapper (#296)

  - Points the `tb-git`, `tb-jira`, and `tb-secret` commands at committed wrappers under each package's `bin/`, so the target exists when the package manager links the command rather than only after a build.

- Fix piped-stdin reads and unhandled EPIPE in the CLIs (#301)

  - Fixes an issue where `tb-secret set` and `tb-jira auth set` failed with `EAGAIN: resource temporarily unavailable` when the producer of a piped credential delayed its first byte, as `tb-secret get`, `op read`, and `gh auth token` all do.
  - Stops `tb-secret`, `tb-jira`, and `tb-git` from crashing with an unhandled `EPIPE` when the reader on their stdout or stderr exits first, so that `tb-secret get | head -1` ends quietly, as a program that ignores `SIGPIPE` does.

- Correct and document the backlog seed's plan line and printed undo (#302)

  - Stops `tb-jira configure-project --seed-backlog` from reporting `no changes: the project already matches the spec` while planning to move work items off the board.
  - Corrects the undo that `--seed-backlog` prints, which failed after a seed of more than 50 keys by posting them all in one call to an endpoint that accepts 50.

### Tests

- Audit the published package shape and record the scaffolding procedure (#274)

  Reduces the placeholder test in the template workspace to a marker, and adds two root-level tests verifying that every published package has the manifest fields, the documentation, and the registration entries that a scaffolded clone must produce.

  Also adds descriptions of the scaffolding procedure to AGENTS.md and the template workspace's README.md.

### Documentation

- Repair the repository's prose and record every rejection's ground (#290)

  Applies one repo-wide `revise-prose` sweep across the repository's READMEs, `AGENTS.md`, source comments, doc descriptions, and test names.

- Document the token scopes each reconciler endpoint needs (#298)

  - Replaces the `Token scopes` placeholder in `packages/atlassian/README.md`, which told a reader to over-grant, with the 23 granular scopes that a scoped Jira API token needs.
  - Adds a `Diagnosing a rejected request` section, since a missing scope reports `401` rather than `403` and a request carrying no credential reports `404` naming the project as not found.

- Restore relativizers across atlassian, secrets, and the workflows (#304)

  - Revises documentation and comments to align with plain-speech doctrine and writing conventions.

### Internal

- Rename toolbelt.jira to toolbelt.atlassian (#273)

  Renames the `jira` package to `atlassian`: `packages/jira/` becomes `packages/atlassian/`, the published name becomes `@williamthorsen/toolbelt.atlassian`, and `scope:jira` becomes `scope:atlassian`.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
