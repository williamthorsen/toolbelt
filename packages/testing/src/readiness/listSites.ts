import type { AdoptionSite } from '@williamthorsen/toolbelt.adoption';

import { type ErrorCaptureKind, listCaptureSites } from './listCaptureSites.ts';
import { listStdioSpies, type StdioSpyKind } from './listStdioSpies.ts';

export type SiteKind = ErrorCaptureKind | StdioSpyKind;

/**
 * Lists every site read by the kit's checks, from each of the idioms for which this package has advice.
 *
 * `defineAdoptionKit` takes one detector, so both reach the kit through this. The sites are sorted by line
 * because nothing downstream sorts them.
 *
 * @internal
 */
export function listSites(source: string): Array<AdoptionSite<SiteKind>> {
  return [...listCaptureSites(source), ...listStdioSpies(source)].toSorted((a, b) => a.line - b.line);
}
