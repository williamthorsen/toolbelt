import type { AdoptionSite } from '@williamthorsen/toolbelt.adoption';

import type { ExitMockKind } from './classifyExitMock.ts';
import { type ConsoleSiteKind, listConsoleSites } from './listConsoleSites.ts';
import { type DisposalHookKind, listDisposalHooks } from './listDisposalHooks.ts';
import { listExitMocks } from './listExitMocks.ts';

export type SiteKind = ConsoleSiteKind | DisposalHookKind | ExitMockKind;

/**
 * Lists every site read by the kit's checks, from each of the idioms for which this package has advice.
 *
 * `defineAdoptionKit` takes one detector, so the three reach the kit through this. The sites are sorted by
 * line because nothing downstream sorts them, and a file's console findings would otherwise print after its
 * exit findings however the file is written.
 *
 * @internal
 */
export function listSites(source: string): Array<AdoptionSite<SiteKind>> {
  return [...listExitMocks(source), ...listConsoleSites(source), ...listDisposalHooks(source)].toSorted(
    (a, b) => a.line - b.line,
  );
}
