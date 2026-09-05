# Workspace template

Private scaffold for a new toolbelt package. Copy this directory to `packages/{domain}` and work through the procedure below.

The template is private and a clone publishes, so the procedure is the difference between the two rather than a set of placeholders to swap. Four manifest fields and both documentation files differ. `packages/git` and `packages/atlassian` are worked examples.

Replace this README in the clone. It documents the scaffold rather than the package, and it contains none of the release-notes markers that a published README needs.

## 1. Rewrite the manifest

Identity:

- `name`: `@williamthorsen/toolbelt.{domain}`.
- `description` and `keywords`: the package's own, with the keywords sorted.
- `homepage`: `https://github.com/williamthorsen/toolbelt/tree/main/packages/{domain}#readme`.
- `repository.directory`: `packages/{domain}`.
- `version`: `0.1.0`. A scaffolded package has published nothing, so it does not inherit the template's version.

The four fields that the template cannot declare, being private:

- Drop `"private": true`.
- Drop `"build": ":"`. That no-op overrides the managed `nmr build`, so a clone that keeps it never builds.
- Add `"prepublishOnly": "nmr build"` under `scripts`. A package that later ships a ReadyUp kit runs `"rdy compile && nmr build"` instead.
- Add `"publishConfig": { "access": "public", "registry": "https://registry.npmjs.org" }`.

## 2. Write a fresh README and changelog

The README's first line is `# @williamthorsen/toolbelt.{domain}`, which the shape audit matches exactly. A one-line description follows, and then the release-notes markers on their own line:

```html
<!-- section:release-notes --><!-- /section:release-notes -->
```

release-kit injects each release's notes between them. A README without them loses its release notes in silence, and this file contains none to copy.

Add an `## Installation` section, and a `## Status` section saying that the package exports nothing yet and naming the issue that its first exports arrive with.

The changelog starts empty: the title, and the line `All notable changes to this project will be documented in this file.` The template's changelog holds its own release history, which belongs to the template.

## 3. Register the package

Four files record a package, and none is generated from another except where noted:

- `.config/release-kit.config.ts`: add `'scope:{domain}': { color: '00ff96' }` under `repoLabels.labels`. Leave the `workspaces` list alone. It contains only a workspace with a legacy tag prefix or an exclusion, and a new package has neither.
- `.github/labels.yaml`: regenerate it with `release-kit sync-labels generate`, which reads the entry added above.
- `.meta/label-map.json`: add `"{domain}": "scope:{domain}"` under `scopes`, by hand.
- `AGENTS.md`: add the domain to the list on the `packages/{domain}/` bullet.

Then run `pnpm install`, which adds the workspace's importer to `pnpm-lock.yaml`.

`__tests__/package-registration.app.unit.test.ts` fails on a missing entry in any of the four, and `__tests__/published-package-shape.app.unit.test.ts` fails on a manifest, README, or changelog that still has the template's shape.

One registration happens off the repo and no test can reach it: npm must know the package as a trusted publisher before its first release, or the tag push publishes nothing. It needs an npm account with 2FA, so it falls to the maintainer rather than to the scaffolding pull request. The command is in the root README, under the release instructions.

## 4. Keep the placeholder test

Copy `src/__tests__/placeholder.unit.test.ts` unchanged. `passWithNoTests` is set on every Vitest project, so a package with no test file exits green rather than failing, and this file is what keeps a scaffolded package from being the first such case.

Delete it once the package's first real tests land.

## What the scaffold does not do

The API that the package will hold, and any migration of an existing package onto it, belong to later tickets. A scaffolded package exports nothing: each of `src/1-proposed`, `src/2-draft`, `src/3-candidate`, and `src/4-release` holds an `index.ts` of `export {}`.
