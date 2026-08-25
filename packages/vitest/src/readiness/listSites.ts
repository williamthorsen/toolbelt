import type { AdoptionSite } from '@williamthorsen/toolbelt.adoption';

import type { ExitMockKind } from './classifyExitMock.ts';
import { type ConsoleSiteKind, listConsoleSites } from './listConsoleSites.ts';
import { listExitMocks } from './listExitMocks.ts';

export type SiteKind = ConsoleSiteKind | ExitMockKind;

/**
 * Lists every site the kit's checks read, from both of the idioms this package has advice for.
 *
 * `defineAdoptionKit` takes one detector, so the two reach the kit through this. The sites are sorted by line
 * because nothing downstream sorts them, and a file's console findings would otherwise print after its exit
 * findings however the file is written.
 *
 * @internal
 */
export function listSites(source: string): Array<AdoptionSite<SiteKind>> {
  return [...listExitMocks(source), ...listConsoleSites(source)].toSorted((a, b) => a.line - b.line);
}
