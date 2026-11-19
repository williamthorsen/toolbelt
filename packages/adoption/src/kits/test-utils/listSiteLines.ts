import type { AdoptionDetector } from '../defineAdoptionKit.ts';
import { listSourceSites } from '../listSourceSites.ts';

/** Lists the lines of the sites that one detector finds in a source, blanked as the kit assembler blanks it. */
export function listSiteLines(detector: AdoptionDetector<string>, source: string): number[] {
  return listSourceSites([detector], source).map(({ line }) => line);
}
