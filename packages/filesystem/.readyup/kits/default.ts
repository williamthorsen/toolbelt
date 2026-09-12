/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.filesystem.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest.
 *
 * Both checks take inventory rather than banning a pattern, and both report at `recommend`: A hand-rolled
 * atomic write and a hand-rolled walk to the filesystem root are correct code that a published function
 * expresses better, not defects. Nothing here is `warn`, and nothing is `error`.
 *
 * `toolbelt.packaging` claims a walk that probes each level for `package.json`, which its `findProjectRoot`
 * resolves, so the walk detector declines such a site. Both kits read that rule from `isProjectRootSearch` in
 * `packages/adoption`, which keeps a consumer installing both packages from seeing one loop reported twice
 * under conflicting advice.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSource } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listFilesystemIdioms } from '../../src/readiness/listFilesystemIdioms.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.filesystem';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/filesystem#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listFilesystemIdioms,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside the exempt paths',
  packageName: PACKAGE_NAME,
  // A test writes these shapes deliberately, and a bootstrap wrapper hand-rolls what it reaches for so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: 'No source writes a file atomically by hand',
      id: 'no-hand-rolled-atomic-write',
      kinds: ['temp-write-rename'],
      severity: 'recommend',
      fix: `Replace the write and rename named above with writeAtomic from ${PACKAGE_NAME}/candidate, called as await writeAtomic(filePath, content). Check where the temp file is staged before taking the substitution as cosmetic: rename is atomic only within one filesystem, so a temp file under the system temporary directory fails with EXDEV the moment the target lives on another volume. writeAtomic stages beside the target, creates missing parent directories, copies an existing target's permission bits onto the replacement, and removes the temp file on failure. It fsyncs nothing, so it promises no torn reads rather than survival of a power loss. Reference: ${README_URL}`,
    },
    {
      name: 'No source walks to the filesystem root by hand',
      id: 'no-hand-rolled-directory-walk',
      kinds: ['chain-probe', 'chain-walk'],
      severity: 'recommend',
      fix: `Replace the loop named above with the directory-chain function that matches what it does, all three from ${PACKAGE_NAME}. A loop that only ascends takes listDirectoryChain, which returns the levels as strings and reads nothing from disk. A loop that probes each level for a name takes findDirectoryChainMatch where it stops at the nearest match, and listDirectoryChainMatches where every level's match matters; the first touches no level beyond the one that matches. All three take a stopAtDir that bounds the ascent, which a hand-rolled loop usually runs without. A loop probing for package.json is left to toolbelt.packaging, whose findProjectRoot covers it. Reference: ${README_URL}`,
    },
  ],
});
