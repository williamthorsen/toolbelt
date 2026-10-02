import type { ParseArgsOptionsConfig } from 'node:util';

import type { JiraRequest } from '../3-candidate/createTokenTransport.ts';
import { resolveJiraBaseUrl } from '../3-candidate/resolveJiraBaseUrl.ts';
import { resolveJiraEmail } from '../3-candidate/resolveJiraEmail.ts';
import { resolveJiraSite } from '../3-candidate/resolveJiraSite.ts';
import { resolveJiraToken } from '../3-candidate/resolveJiraToken.ts';
import { createDeferredStore, stripOneTrailingNewline, type TbJiraEffects } from './subcommand-support.ts';

/**
 * The flags through which every subcommand that calls Jira accepts its credential.
 *
 * @internal
 */
export const CREDENTIAL_OPTIONS = {
  email: { type: 'string' },
  site: { type: 'string' },
  spec: { type: 'string' },
  'token-command': { type: 'string' },
  'token-stdin': { type: 'boolean', default: false },
} as const satisfies ParseArgsOptionsConfig;

/**
 * Resolves the site, email, and token from the flags, the environment, and the spec's fallbacks, and builds the
 * transport through which the subcommand calls Jira.
 *
 * @internal
 */
export async function createSubcommandRequest(
  effects: TbJiraEffects,
  credentials: CredentialValues,
  fallbacks: CredentialFallbacks = {},
): Promise<JiraRequest> {
  const email = resolveJiraEmail({ email: credentials.email, env: effects.env, fallback: fallbacks.email });

  return effects.createRequest({
    baseUrl: await resolveJiraBaseUrl({
      fetch: effects.fetch,
      site: resolveJiraSite({ env: effects.env, fallback: fallbacks.site, site: credentials.site }),
    }),
    email,
    fetch: effects.fetch,
    token: resolveJiraToken({
      account: email,
      env: effects.env,
      store: createDeferredStore(effects),
      token: credentials['token-stdin'] ? stripOneTrailingNewline(await effects.readStdin()) : undefined,
      tokenCommand: credentials['token-command'],
    }),
  });
}

/** The spec values that end the email and site resolution chains. */
export interface CredentialFallbacks {
  readonly email?: string | undefined;
  readonly site?: string | undefined;
}

/** The parsed values of `CREDENTIAL_OPTIONS` on which the request depends. */
export interface CredentialValues {
  readonly email?: string | undefined;
  readonly site?: string | undefined;
  readonly 'token-command'?: string | undefined;
  readonly 'token-stdin'?: boolean | undefined;
}
