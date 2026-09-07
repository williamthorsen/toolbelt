import { firstFilled } from '../internal/firstFilled.ts';

const SITE_VARIABLE = 'JIRA_SITE';

/**
 * Resolves the Jira site from which the gateway base URL is derived, from a supplied value, then the environment,
 * then the fallback. Throws where every source misses.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function resolveJiraSite(options: JiraSiteOptions = {}): string {
  const { env = process.env, fallback, site } = options;

  const resolved = firstFilled(site, env[SITE_VARIABLE], fallback);
  if (resolved === undefined) {
    throw new Error(`No Jira site was given. Supply one, set ${SITE_VARIABLE}, or declare one in the spec.`);
  }

  return resolved;
}

export interface JiraSiteOptions {
  readonly env?: Record<string, string | undefined> | undefined;
  /** The last source, read only where the two above miss. A project spec's `site` reaches the chain here. */
  readonly fallback?: string | undefined;
  /** Takes precedence over every other source, so a caller that read one from its own surface passes it here. */
  readonly site?: string | undefined;
}
