import { parseArgs } from 'node:util';

import { listIssueSummaries } from '../3-candidate/listIssueSummaries.ts';
import { composeIssueListJql, ISSUE_STATES, type IssueState } from './composeIssueListJql.ts';
import { createSubcommandRequest, CREDENTIAL_OPTIONS } from './createSubcommandRequest.ts';
import { type LoadedProjectSpec, loadProjectSpec } from './loadProjectSpec.ts';
import { renderIssueList } from './renderIssueList.ts';
import { EXIT_OK, succeed, type TbJiraEffects } from './subcommand-support.ts';

const DEFAULT_LIMIT = 20;

const ISSUE_LIST_HELP = `Usage: tb-jira issue list [options]

List a Jira project's work items, newest first, one per line: key, status, and summary.

Options:
      --email <address>      Atlassian account email; names the keychain account
  -h, --help                 Print this help
  -L, --limit <n>            Maximum number of work items to list (default: ${DEFAULT_LIMIT})
      --project <key>        Project key, rather than the spec's \`projectKey\`
      --site <host>          Jira site, such as acme.atlassian.net
      --spec <path>          Spec file, rather than the upward search
      --state <state>        open, closed, or all (default: open)
      --token-command <cmd>  Shell line printing the API token
      --token-stdin          Read the API token from stdin

\`open\` lists the work items outside the Done status category, \`closed\` those in it, and \`all\` both.

The spec is optional here. When the upward search finds no \`jira-project-spec.json\`, the project, site, and
email come from the flags and the environment alone.

Resolution orders, each stopping at the first source that supplies a value:
  project  --project, then the spec's \`projectKey\`
  site     --site, then JIRA_SITE, then the spec's \`site\`
  email    --email, then JIRA_EMAIL, then the spec's \`email\`
  token    --token-stdin, then JIRA_API_TOKEN, then --token-command, then the macOS keychain`;

/**
 * Runs the `issue list` subcommand: It resolves the project and the credential, searches the project's work
 * items, and prints one line for each.
 *
 * @internal
 */
export async function runIssueList(args: string[], effects: TbJiraEffects): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      ...CREDENTIAL_OPTIONS,
      help: { type: 'boolean', short: 'h' },
      limit: { type: 'string', short: 'L' },
      project: { type: 'string' },
      state: { type: 'string' },
    },
    strict: true,
  });

  if (values.help === true) return succeed(effects, ISSUE_LIST_HELP);

  const limit = parseLimit(values.limit);
  const state = parseState(values.state);
  const loaded = loadProjectSpec(effects, values.spec);
  const projectKey = selectProjectKey(values.project, loaded, effects.cwd());

  const request = await createSubcommandRequest(effects, values, loaded?.spec);
  const summaries = await listIssueSummaries(request, { jql: composeIssueListJql({ projectKey, state }), limit });
  if (summaries.length > 0) effects.write(`${renderIssueList(summaries)}\n`);

  return EXIT_OK;
}

// region | Helpers

/** Reads `--limit`, which is a positive integer written in decimal digits. */
function parseLimit(value: string | undefined): number {
  if (value === undefined) return DEFAULT_LIMIT;
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`--limit takes a positive integer. Received '${value}'.`);

  return Number(value);
}

/** Reads `--state`, which is one of the states named in the help. */
function parseState(value: string | undefined): IssueState {
  if (value === undefined) return 'open';

  const state = ISSUE_STATES.find((candidate) => candidate === value);
  if (state === undefined) throw new Error(`--state takes open, closed, or all. Received '${value}'.`);

  return state;
}

/** Chooses the project to list, naming the sources that it checked when neither supplies one. */
function selectProjectKey(flag: string | undefined, loaded: LoadedProjectSpec | undefined, cwd: string): string {
  if (flag !== undefined && flag !== '') return flag;
  if (loaded?.spec.projectKey !== undefined) return loaded.spec.projectKey;

  const specSource =
    loaded === undefined
      ? `the search found no jira-project-spec.json at or above ${cwd}`
      : `${loaded.path} does not set \`projectKey\``;

  throw new Error(`A project key is required: pass --project, or set \`projectKey\` in the spec; ${specSource}.`);
}

// endregion | Helpers
