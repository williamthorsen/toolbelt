import { type AdoptionSite, blankNonCode } from '@williamthorsen/toolbelt.adoption';

import { type AtomicWriteKind, listAtomicWriteSites } from './listAtomicWriteSites.ts';
import { type ChainWalkKind, listChainWalkSites } from './listChainWalkSites.ts';

export type FilesystemIdiomKind = AtomicWriteKind | ChainWalkKind;

/**
 * Lists every hand-rolled filesystem idiom in a source that this package publishes a function for.
 *
 * The two idioms share no anchor, so each is matched by its own detector and the results are merged in line
 * order. The function reports both idioms in a file that contains both.
 *
 * This function blanks the source once, and both detectors read the result: Blanking hides an idiom written in a
 * comment or a literal from them. Because blanking preserves every offset, a reported line still names the line in
 * the source, and the walk detector reads each probed name from the original source.
 *
 * @internal
 */
export function listFilesystemIdioms(source: string): Array<AdoptionSite<FilesystemIdiomKind>> {
  const code = blankNonCode(source);
  const sites: Array<AdoptionSite<FilesystemIdiomKind>> = [
    ...listAtomicWriteSites(code),
    ...listChainWalkSites(code, source),
  ];

  return sites.toSorted((a, b) => a.line - b.line);
}
