import { blankNonCode } from 'readyup/check-utils';

import type { AdoptionDetector, AdoptionSite } from './defineAdoptionKit.ts';

/**
 * Lists the sites that the detectors find in a source, merged in line order.
 *
 * The source is blanked once and every detector receives the blanked code with the source beneath it, so an idiom
 * written in a comment or a literal is invisible to the anchor scan of each. Blanking preserves every offset, which
 * keeps a reported line valid in the source and lets a detector read a literal's contents at the offset where the
 * code holds its blanked span.
 *
 * @internal
 */
export function listSourceSites<Kind extends string>(
  detectors: ReadonlyArray<AdoptionDetector<Kind>>,
  source: string,
): Array<AdoptionSite<Kind>> {
  const code = blankNonCode(source);
  return detectors.flatMap((detect) => detect(code, source)).toSorted((a, b) => a.line - b.line);
}
