# Changelog

All notable changes to this project will be documented in this file.

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

- Add createKeychainStore and tb-secret to toolbelt.secrets (#276)

  Adds the first exports to `@williamthorsen/toolbelt.secrets`: `createKeychainStore`, which stores and reads secrets in the macOS keychain with no external dependency. Also adds `tb-secret`, a command that exposes the same store to a shell caller.

  Supports macOS only.

- Ship the tb-jira CLI and document toolbelt.atlassian (#295)

  - Adds the `tb-jira` binary to `@williamthorsen/toolbelt.atlassian`: Its `configure-project` subcommand reconciles a Jira project's statuses, workflow transitions, and board features against a spec file owned by the consuming repo, and `--dry-run` prints the plan and writes nothing.
  - Adds a `tb-jira auth` subcommand, which stores, replaces, and removes the Jira API token in the keychain and reports which source would supply it without printing the token.
  - Adds `resolveJiraSite`, `findJiraTokenSource`, and `JiraTransportError` to `@williamthorsen/toolbelt.atlassian/candidate`, so library code can resolve the site, name which link of the token chain would answer without reading the token, and tell a request that Jira rejected from one that never reached Jira.
  - Adds `promptSecret` and `UnstorableSecretError` to `@williamthorsen/toolbelt.secrets/candidate`, so a caller outside that package can prompt for a secret without echoing it and can tell a token refused by the keychain from a keychain that could not be reached.

### 🐛 Bug fixes

- Stop truncating a secret longer than 128 characters (#278)

  Fixes an issue where `tb-secret set` and `setSecret` stored the first 128 bytes of a longer secret and reported success, so an API token of ordinary length was silently corrupted. Secrets of up to ~2,000 bytes can now be stored; an empty secret or a secret that exceeds the limit is refused.

  At a terminal, `tb-secret set` now prompts for the secret twice. An abandoned prompt reports that nothing was stored.

  Separately, a write can now target a named keychain: `createKeychainStore` returns a writable store for any keychain, and `tb-secret set` now has a `--keychain` option.

- Point every package bin at a committed wrapper (#296)

  - Points the `tb-git`, `tb-jira`, and `tb-secret` commands at committed wrappers under each package's `bin/`, so the target exists when the package manager links the command rather than only after a build.

- Fix piped-stdin reads and unhandled EPIPE in the CLIs (#301)

  - Fixes an issue where `tb-secret set` and `tb-jira auth set` failed with `EAGAIN: resource temporarily unavailable` when the producer of a piped credential delayed its first byte, as `tb-secret get`, `op read`, and `gh auth token` all do.
  - Stops `tb-secret`, `tb-jira`, and `tb-git` from crashing with an unhandled `EPIPE` when the reader on their stdout or stderr exits first, so that `tb-secret get | head -1` ends quietly, as a program that ignores `SIGPIPE` does.

### 🏗️ Internal features

- Scaffold toolbelt.secrets for credential storage (#275)

  Scaffolds `packages/secrets`, an empty workspace for storing and retrieving secrets in the OS credential store, publishing to npm as `@williamthorsen/toolbelt.secrets`.

### 📚 Documentation

- Repair the repository's prose and record every rejection's ground (#290)

  Applies one repo-wide `revise-prose` sweep across the repository's READMEs, `AGENTS.md`, source comments, doc descriptions, and test names.

- Restore relativizers across atlassian, secrets, and the workflows (#304)

  - Revises documentation and comments to align with plain-speech doctrine and writing conventions.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
