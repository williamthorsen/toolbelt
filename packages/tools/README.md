<!-- readme-type: internal -->

# @williamthorsen/toolbelt.tools

The monorepo's own tooling. Private: `.config/release-kit.config.ts` excludes it from release processing, so it
never publishes.

Its entry point is `src/mod.ts`, which the manifest exports as source rather than as a build. `AGENTS.md` at the
repository root governs work on it.
