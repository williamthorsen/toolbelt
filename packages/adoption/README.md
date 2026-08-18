# @williamthorsen/toolbelt.adoption

Shared scaffolding for the toolbelt packages' ReadyUp adoption kits. Private to this monorepo: it exports its
source directly, and esbuild inlines it when `rdy compile` bundles a kit, so it never publishes and never
resolves for a consumer.

## What lives here

- `src/portable/` -- source-scanning primitives. Pure text algorithms with nothing toolbelt about them, held
  here rather than upstream in `readyup/check-utils` until enough detectors have exercised them to justify a
  published signature.
- `src/conventions/` -- toolbelt's own judgments about which files an adoption sweep reads, and which sites a
  package claims where two kits recognize the same idiom.
- `src/kits/` -- the kit-assembly helper, and the sole binding point to `readyup/check-utils`. Its
  `test-utils/` reaches a package's own kit test through the `./test-utils` export, held out of `src/mod.ts`
  so it stays clear of the module graph every kit bundle inlines.

## What a kit looks like

A package's `.readyup/kits/default.ts` declares its checks and points at its detector; everything else --
the self-skip, the source sweep, the adoption count, the finding report -- comes from `defineAdoptionKit`.
