# Changelog

All notable changes to this project will be documented in this file.

## 9.0.0 — 2026-11-13

### 🎉 Features

- Lets `VariantNode.selectVariants` accept an encoded index string such as `'1[0]'`, which it previously rejected, so that every node accepts the same input as `TextNode.selectVariants`. (#569)

### 🪦 Removed

- 🚨 **Breaking:** Removes the `variantIndexCount` field, the instance method `decodeIndices`, the method `assertAllIndicesConsumed`, and the `depth` option of `selectVariants` from `TextNode` in `@williamthorsen/toolbelt.strings/draft`, which existed only to pass state between recursive calls. (#569)

### ♻️ Refactoring

- Replaces the private `enclose` helper in `TextNode.ts` with the exported `enclose` from the same tier. (#569)

### 🧪 Tests

- Removes the `describe(VariantNode)` block from `TextNode.unit.test.ts`, which contained only an `it.todo`, because the `describe(TextNode)` block already tests `VariantNode`. (#573)
- Passes plain closures to `toThrow` in the `numbers` and `strings` tests in place of `vi.fn` wrappers, which the tests never asserted on as mocks. (#574)

### 📚 Documentation

- Moves the edge cases, failure modes, and reasons behind the rules of `dedent` and `stripCommonIndent` from `packages/strings/README.md` into their doc comments, where a caller reads them while using the function, and leaves a short summary of each in the README. (#568)
- Replaces the `@category`, `@experimental`, and `@stage draft` tags on `VariantNode` with `@internal`, because the draft tier's `index.ts` does not export the class. (#573)

## 8.2.4 — 2026-11-12

### ♻️ Refactoring

- Renames the `str` and `inputStr` parameters in the `toolbelt.strings` candidate tier to `text`, the name used by the package's newer modules, without changing the behavior of any function. (#546)
- Moves the module-private helpers of `toolbelt.strings` source and test files, including the non-exported `TokenNode` class in `TextNode.ts`, into a trailing `// region | Helpers` fold, as the declaration-order rule requires. (#547)
- Removes the export and the tier tags from `createDelimitedMatcher` and its `DelimitedMatcherOptions` type, and moves both into a Helpers region at the end of `Interpolator.ts`, because only `Interpolator` uses them and the `3-candidate` index does not re-export them. (#548)
- Retypes `ValidationResult` as a union discriminated on `isValid` whose invalid branch declares `errors` as a non-empty tuple, which lets `validateDelimiters` and `Interpolator` read the first error after narrowing rather than through `getItemAtIndexOrThrow` or a truthiness check. (#549)
- Replaces the local indent helpers in the `strings` kit detectors `listJoinedLineArrays` and `listLayoutBreakingTemplates` with `findCommonIndent`, `findLineIndent`, and `isBlankText` from `src/internal/indent-rules.ts`, and recompiles the kit bundle to match. (#550)
- Moves the top-level comma splitting that `listTopLevelArguments` and the `strings` kit's `listElementSpans` each implemented into `listTopLevelSpans` in `packages/adoption`, which returns offset spans as the shared `TextSpan` type, and recompiles the kit bundles that inline it. (#551)
- Renames the strings kit's detectors `listJoinedLineArrays` and `listLayoutBreakingTemplates` to `listJoinedLineArrayLines` and `listLayoutBreakingTemplateLines`, which name the line numbers that each returns, and recompiles the kit bundle. (#562)

### 🧪 Tests

- Adds a `dedent` test for a template that contains an invalid escape sequence, which checks that `dedent` throws an error matching `/invalid escape sequence/`. (#560)
- Replaces the single-assertion `it` blocks for the positive examples in `packages/strings/src/2-draft/__tests__/toOrdinal.unit.test.ts` with one `it.each` table of input and expected-output pairs. (#561)
- Adds `selectCheck` to `@williamthorsen/toolbelt.adoption/test-utils` and uses it in the kit tool tests in place of selection by position or by a file-local helper, which keeps a reordered or added check from moving an assertion onto a different check and makes a renamed id fail the test. (#564)

## 8.2.3 — 2026-11-12

### 🐛 Bug fixes

- Share one function-literal reader across the readiness kits (#470)

  Fixes the issue that the biased-shuffle check in the `@williamthorsen/toolbelt.arrays` ReadyUp kit missed an inline `function` comparator whose parameter list contains braces, such as `function (a: { n: number }, b: { n: number }) { return Math.random() - 0.5; }`. The change moves the function-literal parsing of the `arrays`, `async`, and `vitest` kits into one shared reader in `adoption`, which finds a `function` expression's body past the braces in its parameter list.

- Claim a trailing-comma setTimeout as a hand-rolled sleep (#487)

  Fixes the issue that the `@williamthorsen/toolbelt.async` ReadyUp kit did not report a hand-rolled sleep whose `setTimeout` call ends in a trailing comma, such as `setTimeout(resolve, 50,)`, as a candidate for `delay`. Replaces the two private copies of the argument splitter, which disagreed on the trailing comma, with one splitter in `packages/adoption` that the async and numbers kits both import.

- Fixes the issue that `pickVariants` and `TextNode.create` from `@williamthorsen/toolbelt.strings/draft` overflowed the stack on a group nested directly after a separator, such as `[a|[b|c]]`, and dropped an empty variant between adjacent separators (`[a||b]`) or after a trailing one (`[a|]`). (#538)
- Fixes the issue that the exported `interpolate`, the static `Interpolator.interpolate`, and an `Interpolator` configured through its constructor or `setOptions` disregarded the `ifMissing` and `noAdaptCase` options: `interpolate('{a} {b}', { a: 'x' }, { ifMissing: 'THROW' })` returned `"x {b}"` instead of throwing. (#539)
- Fixes the issue that `noAdaptCase` left a placeholder unreplaced when the placeholder differed from its key only in case, rather than replacing it with the value as given. (#539)
- Fixes the issue that the `Interpolator` constructor's options type rejected a `mapping`, although the constructor already applied one at runtime. (#539)
- Fixes the issue that `TextNode#selectVariants` emptied a flat `indices` array passed by the caller, which also made `pickWithFingerprint` return empty `indices` and `encodedIndices` and a fingerprint that did not reproduce the pick. (#542)

### ♻️ Refactoring

- Replaces the seed-option types declared separately by each random helper in `arrays`, `numbers`, and `strings` with the shared `SeedOptions`. (#503)

### 🧪 Tests

- Adds `createKitFixture`, which creates a tracked repo, points `process.cwd()` at it, and lists a kit's checks imported afresh, and `runEveryCheck`, which returns every check's report in order, to `@williamthorsen/toolbelt.adoption/test-utils`, and rewrites the kit tests in `src/readiness/__tests__/kit.tool.test.ts` to replace the repeated `createTrackedRepo`, `pointCwdAt`, and `listFreshKitChecks` calls with them. (#469)
- Asserts each thrown error in the `strings` tests by its class, when the code throws a specific one, and a durable fragment of its message instead of the full text, and pairs each malformed template in the `Interpolator` delimiter tests with the fragment that names its own failure. (#540)
- Renames the vague test titles in the `strings` package, such as "handles negative numbers correctly" and "accepts a Map as mapping", to titles that state the condition and the expected outcome, without changing any test body. (#543)

### 📦 Dependencies

- Drops the `@williamthorsen/toolbelt.testing` devDependency from the packages whose kit tests imported `pointCwdAt` from it. (#469)
- Upgrades the catalog's `readyup` from 0.45.1 to 0.46.0 and recompiles each package's `.readyup/kits/default.js` and `.readyup/manifest.json`, because the bundled check utilities changed: `readFile` no longer throws `EISDIR` for a directory path. (#537)

## 8.2.2 — 2026-11-09

### ♻️ Refactoring

- Split the path-expression reader out of listDirectoryAscents (#437)

  Moves the path-expression reader out of `packages/adoption/src/portable/listDirectoryAscents.ts` into its own module, `readPathParts.ts`, adds unit tests for it, and changes it to take each template literal from `listTemplateLiterals` instead of walking templates itself. Recompiles the committed kit bundles to match.

- Bring adoption's kit and ascent modules to the declaration-order and naming rules (#438)

  Reorders the declarations in four `packages/adoption` files to follow the declaration-order rule, which puts the exported logic first and the helpers after it, and makes small naming and structure cleanups in the same files.

### 🧪 Tests

- Replaces each kit test's local copy of the checklist helper with `listKitChecks` from `@williamthorsen/toolbelt.adoption/test-utils`, which throws when the kit's first checklist is missing or staged rather than return an empty list against which an assertion over every check passes. (#434)
- Replaces the copied `listSweptFiles` helper and `JS_TS_EXTENSION` regex in every `self-sweep.unit.test.ts` with `listJsTsSources` from `@williamthorsen/toolbelt.adoption/test-utils`, which lists the files directly inside each given directory that adoption's `isJsTsSource` accepts. (#435)
- Adds `listFreshKitChecks` to `@williamthorsen/toolbelt.adoption/test-utils` and moves every kit test onto it from its own copy of `loadChecks`, which reset Vitest's module registry to obtain a kit that had not yet swept a fixture repo. (#452)
- Deletes the "neither reports nor counts" examples and their `UNCLAIMED` fixtures from the remaining adoption kits' `kit.tool.test.ts`, since the detectors' unit tests already observe each of those declines. (#455)
- Adds `diffAdoptedExports` to `@williamthorsen/toolbelt.adoption/test-utils`, which returns a package's callable exports, the callable exports that `ADOPTED_EXPORTS` omits, and the listed names that the package's tiers don't export, and uses it in place of the hand-written comparison in each package's `adoptedExports.unit.test.ts`. (#458)
- Reduces every adoption kit's `pragma-suppression.tool.test.ts` to its qualified-pragma example, which asserts that the named check drops the site while every other check keeps its count, and deletes the examples that tested readyup's pragma matching rather than the kit. (#459)

## 8.2.1 — 2026-11-07

### 📦 Dependencies

- Bumped `@williamthorsen/toolbelt.numbers` to 7.3.1
- Bumped `@williamthorsen/toolbelt.arrays` to 6.4.1

## 8.2.0 — 2026-10-31

### 🎉 Features

- Adds `findCloseMatch` to `@williamthorsen/toolbelt.strings/candidate`, which returns the candidate closest to a mistyped input by optimal string alignment distance (Levenshtein distance that counts a swap of adjacent characters as one edit), returns `undefined` unless a candidate is within 2 edits and fewer edits away than the input has characters, and breaks a tie in favour of the earliest candidate. (#407)

## 8.1.0 — 2026-10-25

### 🎉 Features

- Adds the structured changelog `.meta/changelog.json` to each package's npm tarball, beside `CHANGELOG.md`. (#398)

### ♻️ Refactoring

- Replaces hand-rolled error descriptions, `instanceof Error` checks on caught values, record guards, directory ascents, and first-letter capitalization in package source with `describeError`, `isError`, `isRecord`, `isRecordOrArray`, `listDirectoryChain`, and `capitalize`, and declares each helper's package from another workspace as a `workspace:*` runtime dependency of the package that adopts it. (#400)

### 🧪 Tests

- Rewrites the array-join fixtures and the untagged multi-line template fixtures in the readiness and parser tests as `dedent` templates that render the same text, and declares `@williamthorsen/toolbelt.strings` as a devDependency of each package that now imports `dedent` in its tests. (#401)

## 8.0.4 — 2026-10-24

### 📦 Dependencies

- Upgrade dependencies to latest compatible versions (#391)

  Upgrades Node.js, pnpm, and the repository's dependencies to their latest compatible releases, which clears the three dev advisories that failed `nmr audit`. The upgrade to `@williamthorsen/eslint-config-typescript` 20.1.3 adds unicorn lint rules, and the code is adapted to them in the same change.

## 8.0.3 — 2026-10-09

### 🎉 Features

- Add a ReadyUp kit recommending toolbelt.cli over hand-rolled argument parsing (#367)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.cli` that reports, through `rdy run --packages`, each call to `node:util`'s `parseArgs` and each function that compares arguments against flag names by hand. Includes `bin/` and `src/bin/` in the kit's sweep, which the other toolbelt kits exempt, because a command-line runner usually lives there.

### 📚 Documentation

- Updates each kit README to show `rdy run --sources` and a `sources: ['npm:…']` config example, and states that this spelling needs readyup 0.40.0 or later. (#371)

## 8.0.2 — 2026-10-02

### 📚 Documentation

- Audits the comments in every authored TypeScript, JavaScript, shell, and YAML source and every `tsconfig*.json` against the comment discipline, cutting comments that paraphrase the code or narrate history, rewriting doc descriptions in the third-person indicative, and adding descriptions to the functions, methods, and classes that had none. (#353)
- Adds `@category` tags to 50 exported tier functions and classes, and `@stage` tags to the 49 of them that lacked one, which puts those 49 under the check in `stage-tag-alignment`. (#353)
- Revises READMEs, doc comments, and test names across the repository to follow the current `plain-speech` and writing-preference rules. (#354)
- Rewords the help text and messages printed by `tb-jira`, `tb-node`, and `tb-secret`, and the advice and skip reasons reported by the adoption kits, to follow the same writing conventions. (#354)

## 8.0.0 — 2026-09-15

### 🎉 Features

- Add a ReadyUp adoption kit reporting hand-rolled guards (#311)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.guards` that reports every function whose entire body re-implements a guard published by the package.

- Add a ReadyUp adoption kit to toolbelt.filesystem (#316)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.filesystem` that recommends `writeAtomic` where a project writes a file to a temporary path and renames it into place, and `listDirectoryChain`, `findDirectoryChainMatch`, or `listDirectoryChainMatches` where a loop ascends to the filesystem root by `path.dirname`.
  - Promotes `writeAtomic` to the candidate tier.

  Migration: Change any import of `writeAtomic` from `@williamthorsen/toolbelt.filesystem/proposed` to `@williamthorsen/toolbelt.filesystem/candidate`.

- Read a directory walk's probed name through a binding or constant (#324)

  - Extends the ReadyUp adoption kit in `@williamthorsen/toolbelt.packaging` to recommend `findPackageRoot` or `resolveSelfVersion` for a hand-rolled `package.json` search that checks for the file through a variable declared once inside its loop and never reassigned there, or through a string constant declared once in the same file.
  - Stops the kit in `@williamthorsen/toolbelt.filesystem` from reporting such a search, which it previously treated as a generic directory walk.

- 🚨 **Breaking:** Promote dedent and stripCommonIndent to the release tier (#328)

  - Moves `dedent`, `stripCommonIndent`, and the `Dedent`, `DedentOptions`, and `DedentValue` types from `@williamthorsen/toolbelt.strings/candidate` to `@williamthorsen/toolbelt.strings`.

  Migration: Import `dedent`, `stripCommonIndent`, `Dedent`, `DedentOptions`, and `DedentValue` from `@williamthorsen/toolbelt.strings` rather than `@williamthorsen/toolbelt.strings/candidate`.

- Report hand-rolled dedents in the strings adoption kit (#330)

  - Adds `no-joined-line-array`, which reports an array of string or template literals that spans several lines and is joined with a newline.
  - Adds `no-layout-breaking-template`, which reports an untagged template literal whose later lines drop below the indentation of the line on which it opens.

### 🐛 Bug fixes

- Stop reading each segment of a probe's path as a separately probed name (#320)

  - Fixes an issue in which `toolbelt.filesystem`'s ReadyUp adoption kit treated a loop over parent directories as a search for each directory's own `package.json` when the path checked at each level contained a `'package.json'` literal, as in `path.join(dir, 'node_modules', name, 'package.json')`, and so did not report the loop under `no-hand-rolled-directory-walk`.

### ♻️ Refactoring

- Move directory-walk recognition from filesystem into packages/adoption (#318)

  - Adds `listDirectoryAscents` to `packages/adoption`, which reports each directory ascent once with the names probed by its innermost loop, and reduces `filesystem`'s `listChainWalkSites` to a partition of that output, so a `toolbelt.packaging` kit can partition the same ascents without its own copy of the recognition.
  - Renames the hand-off rule `isProjectRootSearch` to `isManifestSearch` and rewrites the text in `packages/adoption` and `filesystem` that credited `findProjectRoot` alone with a `package.json` walk.
  - Stops `filesystem`'s kit from reporting a loop that ascends one binding around an inner loop ascending another binding and probing for `package.json`, which is the only finding changed by the move.

### 🧪 Tests

- Move the rdy run report reader into the adoption test utilities (#323)

  - Replaces the `rdy run --json` report reader copied into each of the twelve `pragma-suppression.tool.test.ts` suites with `listKitCheckReports`, a helper added to `@williamthorsen/toolbelt.adoption/test-utils` that runs a package's compiled kit over a fixture repo and returns its check reports, so a change to the shape of readyup's report needs one edit rather than twelve.
  - Fixes the error thrown for a kit that does not load: Each copy discarded the load error recorded by `rdy` on the kit's entry and threw "the run reported no adoption checks", and the helper throws with `rdy`'s own message instead.

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

## 7.2.0 — 2026-09-06

### 🎉 Features

- Add a ReadyUp adoption kit (#253)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.objects`. The kit recommends `Object.hasOwn` or the package's own `hasOwnProperty` in place of a call reached through `Object.prototype`, and `isRecord` or `isRecordOrArray` in place of a guard written as `typeof value === 'object' && value !== null`. Its third check warns that a comparison of two `JSON.stringify` calls is key-order dependent and should be replaced by `isEqual`.

- Add a ReadyUp adoption kit reporting hand-rolled sleeps (#303)

  - Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.async` that recommends the use of `delay` to replace a hand-rolled sleep.

### 📚 Documentation

- Document the generated-source exemption in the adoption kits (#251)

  Documents the generated- and vendored-source exemption in the `errors`, `numbers`, and `strings` READMEs.

- Repair reduced object relatives in passages recurring across files (#262)

  Repairs the reduced object relative in the prose passages that recur across more than one file, in package READMEs, source comments, test titles, and the ReadyUp kits' check messages.

- Repair reduced object relatives in the READMEs and AGENTS.md (#263)

  Repairs the reduced object relative in `AGENTS.md`, the root `README.md`, and the package READMEs.

- Repair reduced object relatives in packages/adoption (#264)

  Repairs the reduced object relative in `packages/adoption`, in source comments, doc descriptions, and test titles.

- Repair reduced object relatives in the readiness modules and kits (#265)

  Repairs the reduced object relative in the six kit-bearing packages' readiness modules and ReadyUp kit sources, across comments, doc descriptions, test titles, and the kits' check messages.

- Repair the repository's prose and record every rejection's ground (#290)

  Applies one repo-wide `revise-prose` sweep across the repository's READMEs, `AGENTS.md`, source comments, doc descriptions, and test names.

## 7.1.0 — 2026-08-30

### 🎉 Features

- Add a ReadyUp adoption kit to `strings` (#248)

  Adds a ReadyUp adoption kit to `@williamthorsen/toolbelt.strings`. Where appropriate, the kit recommends the use of `capitalize` or `pluralize` to replace hand-rolled capitalization and pluralization code, respectively.

## 7.0.0 — 2026-08-28

### 🎉 Features

- 🚨 **Breaking:** Promote pluralize and pluralizeWithCount to the release tier (#229)

  Promotes `pluralize` and `pluralizeWithCount` to the release tier of `@williamthorsen/toolbelt.strings`.

  Migration: Both must be imported from `@williamthorsen/toolbelt.strings` rather than `@williamthorsen/toolbelt.strings/candidate`.

- Add hashString to derive a deterministic number from a string (#233)

  Adds a `hashString` function to `@williamthorsen/toolbelt.strings` at the candidate tier. The function derives a number deterministically from a string for a stable bucket, index, or slot. It returns a value across the full 32-bit range by default; `min` and `max` bound it inclusively, and `offset` rotates the result.

- 🚨 **Breaking:** Rename joinStrings to joinTruthy and drop its lastSeparator option (#240)

  Renames `joinStrings` to `joinTruthy` in `@williamthorsen/toolbelt.strings/candidate` and removes its `lastSeparator` option, narrowing the function to a single job: dropping falsy members from an array and joining what remains with `separator`.

  Migration: Replace `joinStrings` with `joinTruthy` if `lastSeparator` is not used; otherwise, use `Intl.ListFormat` and filter falsy values out of the array first.

### ♻️ Refactoring

- Remove concatenate in favour of Intl.ListFormat (#238)

  Removes `concatenate` from `@williamthorsen/toolbelt.strings/draft`, which reimplemented `Intl.ListFormat` without its locale awareness. The platform formatter produces identical output for every input `concatenate` accepted, and adds disjunction, the `unit`, `short`, and `narrow` styles, and every CLDR locale.

  Migration: Call `new Intl.ListFormat('en').format(strings)` instead of `concatenate(strings)`, and pass only strings, because a non-string member would raise a `TypeError`. If a custom separator is needed, use `Array.prototype.join`, because `Intl.ListFormat` does not support one.

## 6.0.3 — 2026-08-24

### ♻️ Refactoring

- Correct `obfuscate`'s and `slugify`'s error classes (#225)

  Fixes lint issues in `@williamthorsen/toolbelt.strings`. `obfuscate` and `slugify` now throw errors based on the class of failure instead of a bare `Error` for every throw.

  Also adds `@category` tags where missing and removes the unused `StrictObject` type.

## 6.0.2 — 2026-08-24

### Dependency updates

- Bumped `@williamthorsen/toolbelt.numbers` to 7.0.1
- Bumped `@williamthorsen/toolbelt.arrays` to 6.0.1

## 6.0.1 — 2026-08-21

### 🐛 Bug fixes

- Adopt `clamp` in `obfuscate` and reject a NaN size option (#196)

  Fixes the issue that `obfuscate` returned its input unobfuscated when `bookendSize` was NaN, and returned the bookends with the fill cleared when `fillSize` was NaN. Both options now throw an `Error` naming the offending option.

  Separately, the bookend count is bounded through `clamp` from `@williamthorsen/toolbelt.numbers/candidate` rather than by hand.

## 6.0.0 — 2026-08-16

### 🎉 Features

- 🚨 **Breaking:** Rename `unindent` to `dedent` and correct its indentation semantics (#171)

  Renames `unindent` to `dedent` in `@williamthorsen/toolbelt.strings/candidate` and corrects five defects in how it removes indentation. Adds `stripCommonIndent`, the same rules as a plain function, for text that arrives at runtime rather than being written in source.

  Migration: `unindent` no longer exists, and nullish and object values are now compile errors. Both exports stay at candidate tier.

### 🧪 Tests

- Drop expect-type in favor of expectTypeOf (#175)

  Replaces all imports of `expectTypeOf` from `expect-type` with the same import from `vitest`. Previously there had been imports from both libraries. `expect-type` is removed as a dependency.

## 5.0.0 — 2026-08-15

### 🎉 Features

- 🚨 **Breaking:** Fix unsound narrowing in `getAtIndexOrThrow` and rename it to `getItemAtIndexOrThrow` (#152)

  Fixes an issue where `getAtIndexOrThrow` could falsely treat an `undefined` return value as satisfying a return type that excluded `undefined`. The function now throws a `RangeError` if the array holds no item at the index and a `TypeError` if the index is not a safe integer. `undefined` is a valid return value if the input array's type allows `undefined` elements. The function is renamed `getItemAtIndexOrThrow`.

  Separately, `findOrThrow` now decides a match by its predicate rather than by the value it found, so an element is not treated as not found merely because it is falsy. Its return type is now `T` rather than `NonNullable<T>`.

  Migration: Consumers of `@williamthorsen/toolbelt.arrays/candidate` import `getItemAtIndexOrThrow` in place of `getAtIndexOrThrow`.

## 4.0.1 — 2026-08-13

### ⚙️ Tooling

- Remove redundant .gitignore files
- Populate manifest metadata and adopt a pnpm catalog (#140)

  Adopts a pnpm catalog to avoid specifying the version of a common dependency in multiple places. Separately, fixes violations of newly activated `package-json` lint rules. Missing values have been added to `package.json` fields across the repo, and package descriptions are improved.

## 4.0.0 — 2026-08-12

### 🎉 Features

- 🚨 **Breaking:** Rename get* functions by return kind and verb specificity (#119)

  Renames thirteen functions across various packages to align with a consistent naming pattern.

### ♻️ Refactoring

- Stop shipping test-only and dead support modules (#117)

  Fixes an issue where `@williamthorsen/toolbelt.numbers`, `@williamthorsen/toolbelt.objects`, and `@williamthorsen/toolbelt.strings` each shipped a module that was never importable.

- Align stray modules with layout and TypeScript conventions (#118)

  Aligns all packages with code-layout and annotation conventions, ending a handful of long-standing exceptions. Documentation has been updated to make the conventions clear.

## 3.2.0 — 2026-08-08

### ♻️ Refactoring

- Fixes violations surfaced by newly active lint rules (#84)
- Fix slug punctuation and require safe integers (#86)

  - Fixes an issue where the use of certain letters as the slug separator in `slugify` would leave punctuation marks in the result.
  - Time-unit conversions, scaling range bounds, normal-distribution interval counts, and array indices in object paths now reject values too large to represent exactly instead of silently losing precision.
  - Seeded number generators now produce distinct sequences for seeds at or beyond 2^53, where adjacent seeds previously collapsed onto nearly identical output. A seed of that size saved before this release no longer reproduces the same output.

- Fix deferred violations of unicorn lint rules (#88)

  Fixes issues surfaced by `unicorn` lint rules that were temporarily downgraded to warnings and restores the rules to "error" severity. Separately, the `Queue` class in `dstructs` has been modified to hide its internal array.

### ⚙️ Tooling

- Migrate Vitest configs to the nmr projects model (#73)

  Packages no longer need to declare their own Vitest config. Test suites are now selected by a test file's name suffix rather than by choosing a config file: `*.app.test.ts` and `*.int.test.ts` route to the app and integration suites, and everything else runs as a unit test. Local development is now declared to require Node 24.16 or later.

- Adopt the centralized tsconfig with more modern settings (#81)

  Raises the language level for typechecking to ES2025, so code across the monorepo can now use `Promise.try`, `RegExp.escape`, the new `Set` methods, and iterator helpers. Typechecking is also stricter: properties reached through an index signature must now be read with bracket access. Published output is unchanged.

- Adopt the mechanical-syntax deferred unicorn rules (#82)

  Promotes ten deferred lint rules from warnings to errors and fixes the issues surfaced by those rules. One published behavior changes as well: Converting a Map to a plain object no longer drops an entry keyed `__proto__`.

- Use identical compiler settings for all packages (#105)

  All packages now have identical compiler settings, using the settings from the `@williamthorsen/tsconfig` base config without modification.

## 3.1.8 — 2026-07-27

### ⚙️ Tooling

- Normalize Vitest, and lint configs

### 📚 Documentation

- Change license to ISC

## 3.1.7 — 2026-07-24

### ⚙️ Tooling

- Configure release-kit & repo labels

## 3.1.6 — 2026-07-20

### 🐛 Bug fixes

- Add repository field to package manifests for npm provenance (#65)

  Fixes an issue that prevented every package from publishing to npm. Each package now links to its source repository from its npm page.

### 📦 Dependencies

- Upgrade ESLint packages and migrate to TypeScript 6 (#67)

  Upgrades the toolchain to TypeScript 6 and ESLint 10.

## 3.1.5 — 2026-07-20

### ⚙️ Tooling

- Migrate to the nmr toolchain and resolve dependency vulnerabilities (#45)

  Every monorepo task (build, test, lint, and audit) now runs through the shared `nmr` toolchain instead of the repository's previous hand-rolled scripts, bringing it into line with other repositories.

## 3.1.4 — 2026-03-19

### 🎨 Formatting

- Format changelogs

## 3.1.1 — 2026-03-10

### 📦 Dependencies

- Adapt to dependency upgrades and bump Node engine to >=24 (#8)

  Upgrades all dependencies to their latest versions, bumps the Node.js engine requirement from >=18.17.0 to >=24.0.0 across all 13 workspace packages, and adapts source code to satisfy new lint rules introduced by the upgraded ESLint plugins. Also upgrades `@williamthorsen/eslint-config-typescript` from 5.12.1 to 5.12.2 to fix ESM import issues in the compiled output.

  Commit details:

  - root|deps: Upgrade all deps to latest version

  - root|refactor: Fix lint

  - root|deps: Upgrade all deps to latest minor version

  - root|deps: Allow unpatchable vulns in dev deps

  - root|refactor: Adapt to dependency upgrades and bump Node engine to >=24
  * Upgrade eslint-config-typescript to 5.12.2 (fixes ESM import issues, removes need for pnpm patch)
  * Bump engines.node from >=18.17.0 to >=24.0.0 across all packages
  * Update CI to Node 24.14.0 and pnpm 10.30.3
  * Replace .sort() with .toSorted() to satisfy unicorn/no-array-sort
  * Fix lint errors: remove useless default assignments, redundant type constituents, deprecated re-exports, and empty array args to Set constructor
  - datetime|tests: Fix locale mismatch in Timestamp test

  Pass the same 'en-US' locale to both the expected-value computation and
  the method under test. Previously the test used the system default locale
  for the expected value but explicit 'en-US' for the actual call, which
  diverged under Node 24's updated Intl formatting.

  - root|refactor: Replace toThrow with toThrowError across all tests

  The vitest/no-alias-methods rule in strict-lint requires the canonical
  toThrowError() name instead of the toThrow() alias.

  - root|refactor: Fix remaining strict-lint errors
  * Use import() in vi.mock for vitest/prefer-import-in-mock
  * Replace expect(typeof x).toBe() with expectTypeOf for vitest/prefer-expect-type-of
  * Use String.raw for regex escapes for unicorn/prefer-string-raw
  - root|tooling: Use ws runner to fix recursive build command

  The build script used `pnpm --recursive run build` but no workspace package defines a `build` script — they all use `ws build` through the workspace script runner. Aligns with all other recursive commands.

## 3.1.0 — 2026-03-08

### 📦 Dependencies

- Adapt to dependency upgrades and bump Node engine to >=24 (#8)

  Upgrades all dependencies to their latest versions, bumps the Node.js engine requirement from >=18.17.0 to >=24.0.0 across all 13 workspace packages, and adapts source code to satisfy new lint rules introduced by the upgraded ESLint plugins. Also upgrades `@williamthorsen/eslint-config-typescript` from 5.12.1 to 5.12.2 to fix ESM import issues in the compiled output.

  Commit details:

  - root|deps: Upgrade all deps to latest version

  - root|refactor: Fix lint

  - root|deps: Upgrade all deps to latest minor version

  - root|deps: Allow unpatchable vulns in dev deps

  - root|refactor: Adapt to dependency upgrades and bump Node engine to >=24
  * Upgrade eslint-config-typescript to 5.12.2 (fixes ESM import issues, removes need for pnpm patch)
  * Bump engines.node from >=18.17.0 to >=24.0.0 across all packages
  * Update CI to Node 24.14.0 and pnpm 10.30.3
  * Replace .sort() with .toSorted() to satisfy unicorn/no-array-sort
  * Fix lint errors: remove useless default assignments, redundant type constituents, deprecated re-exports, and empty array args to Set constructor
  - datetime|tests: Fix locale mismatch in Timestamp test

  Pass the same 'en-US' locale to both the expected-value computation and
  the method under test. Previously the test used the system default locale
  for the expected value but explicit 'en-US' for the actual call, which
  diverged under Node 24's updated Intl formatting.

  - root|refactor: Replace toThrow with toThrowError across all tests

  The vitest/no-alias-methods rule in strict-lint requires the canonical
  toThrowError() name instead of the toThrow() alias.

  - root|refactor: Fix remaining strict-lint errors
  * Use import() in vi.mock for vitest/prefer-import-in-mock
  * Replace expect(typeof x).toBe() with expectTypeOf for vitest/prefer-expect-type-of
  * Use String.raw for regex escapes for unicorn/prefer-string-raw
  - root|tooling: Use ws runner to fix recursive build command

  The build script used `pnpm --recursive run build` but no workspace package defines a `build` script — they all use `ws build` through the workspace script runner. Aligns with all other recursive commands.

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
