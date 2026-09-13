/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.packaging.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest.
 *
 * The one check takes inventory rather than banning a pattern: A hand-rolled search for `package.json` is correct
 * code that a published function expresses better, so it reports at `recommend`. Nothing here is `warn`, because
 * none of it is a defect.
 *
 * Three functions replace such a search, and one check covers them all. The scan reads which names a walk probes,
 * but not where the walk starts or what it does with the manifest, and those decide the function, so the fix text
 * lets the reader choose by purpose.
 *
 * A walk probing each level for root markers alone, such as `.git`, belongs to `toolbelt.filesystem`, as does one
 * probing nothing, and that package's kit reports both. The two kits divide the probing walks by `isManifestSearch`
 * in `packages/adoption`, which keeps a consumer installing both packages from seeing one loop reported twice under
 * conflicting advice.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSource } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listManifestSearchSites } from '../../src/readiness/listManifestSearchSites.ts';

const FILESYSTEM_PACKAGE_NAME = '@williamthorsen/toolbelt.filesystem';
const PACKAGE_NAME = '@williamthorsen/toolbelt.packaging';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/packaging#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listManifestSearchSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside the exempt paths',
  packageName: PACKAGE_NAME,
  // A test writes this walk deliberately, and a bootstrap wrapper hand-rolls what it reaches for so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: 'No source searches the directory chain for package.json by hand',
      id: 'no-hand-rolled-manifest-search',
      kinds: ['manifest-search'],
      severity: 'recommend',
      fix: `Replace the loop named above with the function that matches what the loop looks for. Where it finds the package that owns the running module, call findPackageRoot(import.meta.url) from ${PACKAGE_NAME}/candidate, or resolveSelfVersion(import.meta.url) from the same subpath where the loop goes on to read the manifest's version. Both pass over a manifest that declares no name, such as the one that a dual-format build leaves in dist/, and both throw where no ancestor declares one. Where it finds the project that holds a directory, call findProjectRoot(dir) from ${PACKAGE_NAME}. It prefers .git and lockfiles to package.json, so in a monorepo it returns the repository root rather than the nearest package, and it returns the start directory rather than throwing where it finds neither. Where it needs the nearest manifest whatever that manifest declares, call findDirectoryChainMatch(dir, ['package.json']) from ${FILESYSTEM_PACKAGE_NAME}, since no function in this package returns it. Reference: ${README_URL}`,
    },
  ],
});
