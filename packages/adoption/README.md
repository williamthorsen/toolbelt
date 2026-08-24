# @williamthorsen/toolbelt.adoption

Shared scaffolding for the toolbelt packages' ReadyUp adoption kits. Private to this monorepo: it exports its
source directly, and esbuild inlines it when `rdy compile` bundles a kit, so it never publishes and never
resolves for a consumer.

The layer declares no workspace dependency. Every kit-bearing package devDeps it, foundation packages
included, and `filesystem` deps `errors`, so a dependency of its own closes a cycle pnpm cannot order. Its test
scaffolding -- `createTempDir` and `pointCwdAt` in `src/kits/test-utils/` -- is held to node builtins for that
reason, and the root's `__tests__/workspace-dependency-graph.app.unit.test.ts` fails on a cycle.

## What lives here

- `src/portable/` -- source-scanning primitives. Pure text algorithms with nothing toolbelt about them, held
  here rather than upstream in `readyup/check-utils` until enough detectors have exercised them to justify a
  published signature. Two have made that passage: `src/mod.ts` re-exports `blankNonCode` and
  `getLineAtOffset` from `readyup/check-utils` rather than holding copies that drift from it.
- `src/conventions/` -- toolbelt's own judgments about which files an adoption sweep reads, and which sites a
  package claims where two kits recognize the same idiom.
- `src/kits/` -- the kit-assembly helper, and the only module binding to readyup's kit machinery: the sweep,
  the adoption count, and the finding report. Its `test-utils/` reaches a package's own kit test through the
  `./test-utils` export, held out of `src/mod.ts` so it stays clear of the module graph every kit bundle
  inlines.

## What a kit looks like

A package's `.readyup/kits/default.ts` declares its checks and points at its detector; everything else --
the source sweep, the adoption count, the own-implementation exemption, the finding report -- comes from
`defineAdoptionKit`.

Each check declares an `id` alongside its name, which is what a consumer's `rdy-ignore` pragma names to
suppress that check alone. `AdoptionCheck` requires it, though readyup's own field is optional: a check
carrying none can be silenced only along with every other check on the line, and nothing reports the loss.
Two checks sharing one id lose the same guarantee from the other direction, so `defineAdoptionKit` refuses a
kit that gives one id twice.
