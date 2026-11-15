import { findFirstFilled } from '../internal/findFirstFilled.ts';
import { JiraSettingError } from './JiraSettingError.ts';

const SITE_VARIABLE = 'JIRA_SITE';

/**
 * Resolves the Jira site from which the gateway base URL is derived, from a supplied value, then the environment,
 * then the fallback. Throws `JiraSettingError` when every source misses.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function resolveJiraSite(options: JiraSiteOptions = {}): string {
  const { env = process.env, fallback, site } = options;

  const resolved = findFirstFilled(site, env[SITE_VARIABLE], fallback);
  if (resolved === undefined) {
    throw new JiraSettingError(`No Jira site was given. Supply one, set ${SITE_VARIABLE}, or declare one in the spec.`);
  }

  return resolved;
}

export interface JiraSiteOptions {
  readonly env?: Record<string, string | undefined> | undefined;
  /** The last source, read only when the two above miss. A caller passes a project spec's `site` here. */
  readonly fallback?: string | undefined;
  /** Takes precedence over every other source, so a caller that read one from its own surface passes it here. */
  readonly site?: string | undefined;
}
