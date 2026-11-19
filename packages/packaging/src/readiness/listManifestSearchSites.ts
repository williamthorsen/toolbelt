import { type AdoptionSite, isManifestSearch, listDirectoryAscents } from '@williamthorsen/toolbelt.adoption';

export type ManifestSearchKind = 'manifest-search';

/**
 * Lists every hand-rolled search of the directory chain for `package.json` in a source, from the ascents that
 * `listDirectoryAscents` finds.
 *
 * A walk is claimed when `isManifestSearch` accepts the names that it probes, the rule by which
 * `toolbelt.filesystem`'s kit declines the same walk. That kit claims a bare ascent and a walk probing root markers
 * alone.
 *
 * Takes the code blanked by the kit assembler, so a walk written in a comment or a literal is not one, and reads
 * each probed name from the source beneath.
 *
 * @internal
 */
export function listManifestSearchSites(code: string, source: string): Array<AdoptionSite<ManifestSearchKind>> {
  return listDirectoryAscents(code, source)
    .filter(({ probedNames }) => probedNames !== undefined && isManifestSearch(probedNames))
    .map(({ line }): AdoptionSite<ManifestSearchKind> => ({ kind: 'manifest-search', line }));
}
