import { type AdoptionSite, isManifestSearch, listDirectoryAscents } from '@williamthorsen/toolbelt.adoption';

export type ChainWalkKind = 'chain-probe' | 'chain-walk';

/**
 * Lists every hand-rolled walk to the filesystem root in a source, from the ascents that `listDirectoryAscents`
 * finds in the blanked code produced by `listFilesystemIdioms`.
 *
 * A walk probing each level for a name reports as `chain-probe` and a bare ascent as `chain-walk`, the two
 * taking different substitutions. A walk probing for `package.json` is `toolbelt.packaging`'s, reported by its
 * kit, and is dropped here on `isManifestSearch`, the rule that both kits read.
 *
 * @internal
 */
export function listChainWalkSites(code: string, source: string): Array<AdoptionSite<ChainWalkKind>> {
  return listDirectoryAscents(code, source).flatMap(({ line, probedNames }): Array<AdoptionSite<ChainWalkKind>> => {
    if (probedNames === undefined) return [{ kind: 'chain-walk', line }];
    return isManifestSearch(probedNames) ? [] : [{ kind: 'chain-probe', line }];
  });
}
