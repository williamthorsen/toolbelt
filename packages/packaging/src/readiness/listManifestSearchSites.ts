import {
  type AdoptionSite,
  blankNonCode,
  isManifestSearch,
  listDirectoryAscents,
} from '@williamthorsen/toolbelt.adoption';

export type ManifestSearchKind = 'manifest-search';

/**
 * Lists every hand-rolled search of the directory chain for `package.json` in a source, from the ascents that
 * `listDirectoryAscents` finds.
 *
 * A walk is claimed where `isManifestSearch` accepts the names that it probes, the rule by which
 * `toolbelt.filesystem`'s kit declines the same walk. A bare ascent and a walk probing root markers alone stay with
 * that kit.
 *
 * The source is blanked before the scan, so a walk written in a comment or a literal is invisible here, while each
 * probed name is still read from the source beneath.
 *
 * @internal
 */
export function listManifestSearchSites(source: string): Array<AdoptionSite<ManifestSearchKind>> {
  return listDirectoryAscents(blankNonCode(source), source)
    .filter(({ probedNames }) => probedNames !== undefined && isManifestSearch(probedNames))
    .map(({ line }): AdoptionSite<ManifestSearchKind> => ({ kind: 'manifest-search', line }));
}
