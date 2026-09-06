import { parseArgs } from 'node:util';

import { applyBoardFeatures } from '../3-candidate/applyBoardFeatures.ts';
import { applyWorkflowUpdate } from '../3-candidate/applyWorkflowUpdate.ts';
import { buildReconciliationPlan } from '../3-candidate/buildReconciliationPlan.ts';
import { buildVerificationReport } from '../3-candidate/buildVerificationReport.ts';
import { listIssueKeys } from '../3-candidate/listIssueKeys.ts';
import { moveIssuesToBacklog } from '../3-candidate/moveIssuesToBacklog.ts';
import { parseProjectSpec } from '../3-candidate/parseProjectSpec.ts';
import { readBoardColumnReport } from '../3-candidate/readBoardColumnReport.ts';
import { readProjectConfiguration } from '../3-candidate/readProjectConfiguration.ts';
import { resolveJiraBaseUrl } from '../3-candidate/resolveJiraBaseUrl.ts';
import { resolveJiraEmail } from '../3-candidate/resolveJiraEmail.ts';
import { resolveJiraSite } from '../3-candidate/resolveJiraSite.ts';
import { resolveJiraToken } from '../3-candidate/resolveJiraToken.ts';
import { DEFAULT_TOKEN_SERVICE } from '../internal/jiraTokenChain.ts';
import { renderPlan } from './renderPlan.ts';
import { renderVerification } from './renderVerification.ts';
import {
  createDeferredStore,
  EXIT_MISMATCH,
  EXIT_OK,
  stripOneTrailingNewline,
  succeed,
  type TbJiraEffects,
} from './subcommand-support.ts';

/**
 * What `POST /rest/agile/1.0/board/{boardId}/issue` accepts in one call, which bounds the undo that the
 * seed prints.
 */
const BOARD_MOVE_LIMIT = 50;

const CONFIGURE_HELP = `Usage: tb-jira configure-project <KEY> [options]

Reconcile a Jira project's statuses, workflow transitions, and board features against a declarative spec, then
report what the server holds afterwards. The run is idempotent: a project already matching the spec is left
untouched.

Options:
  -h, --help                 Print this help
      --dry-run              Print the plan and write nothing
      --email <address>      Atlassian account email; names the keychain account
      --seed-backlog <name>  Move every work item in that status off the board and into the backlog
      --site <host>          Jira site, such as acme.atlassian.net
      --spec <path>          Spec file, rather than the upward search
      --token-command <cmd>  Shell line printing the API token
      --token-stdin          Read the API token from stdin

The spec is the consuming repo's file, found by ascending from the working directory for
\`jira-project-spec.json\`; \`--spec\` names one directly.

Resolution orders, each stopping at the first source that answers:
  site   --site, then JIRA_SITE, then the spec's \`site\`
  email  --email, then JIRA_EMAIL, then the spec's \`email\`
  token  --token-stdin, then JIRA_API_TOKEN, then --token-command, then the macOS keychain

The token is read from the keychain under the service \`${DEFAULT_TOKEN_SERVICE}\`, with the email as the
account. Store one with \`tb-jira auth set\`. The base URL is the \`api.atlassian.com\` gateway, whose cloudId
is read from the site without authentication.

Jira Cloud and team-managed projects only. A company-managed project is refused rather than reconciled: a
status renamed there is renamed in every project on the site that uses it.

Board columns cannot be set through the public API. The closing report names any spec status mapped to no
column, and any column order differing from the spec's; both are fixed by dragging in the board settings.

A board feature locked by Jira is reported as \`locked\` in the plan and \`LOCK\` in the closing report, and is
never written: the call would answer 200 and change nothing. Neither it nor a column gap affects the exit code.`;

/**
 * Runs the `configure-project` subcommand: it resolves the credential, plans the reconciliation against the
 * project's live configuration, writes what the plan holds, and reports what the server holds afterwards.
 *
 * @internal
 */
export async function runConfigureProject(args: string[], effects: TbJiraEffects): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      'dry-run': { type: 'boolean', default: false },
      email: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      'seed-backlog': { type: 'string' },
      site: { type: 'string' },
      spec: { type: 'string' },
      'token-command': { type: 'string' },
      'token-stdin': { type: 'boolean', default: false },
    },
    strict: true,
  });

  if (values.help === true) return succeed(effects, CONFIGURE_HELP);

  const projectKey = selectProjectKey(positionals);
  const seedBacklog = values['seed-backlog'];
  const spec = parseProjectSpec(effects.readTextFile(values.spec ?? effects.findSpecPath(effects.cwd())));

  const email = resolveJiraEmail({ email: values.email, env: effects.env, fallback: spec.email });
  const request = effects.createRequest({
    baseUrl: await resolveJiraBaseUrl({
      fetch: effects.fetch,
      site: resolveJiraSite({ env: effects.env, fallback: spec.site, site: values.site }),
    }),
    email,
    fetch: effects.fetch,
    token: resolveJiraToken({
      account: email,
      env: effects.env,
      store: createDeferredStore(effects),
      token: values['token-stdin'] ? stripOneTrailingNewline(await effects.readStdin()) : undefined,
      tokenCommand: values['token-command'],
    }),
  });

  const configuration = await readProjectConfiguration(request, projectKey);
  const plan = buildReconciliationPlan(spec, configuration);
  effects.write(`${renderPlan(plan, configuration, { projectKey, seedBacklog })}\n`);

  if (values['dry-run']) {
    effects.write('\ndry run: nothing was written\n');

    return EXIT_OK;
  }

  const { correctedStatuses, written } = await applyWorkflowUpdate(request, configuration, plan);
  effects.write(
    written
      ? `workflow updated: ${plan.statusUpdates.length} amended, ${plan.creations.length} created\n`
      : 'workflow unchanged\n',
  );
  if (correctedStatuses.length > 0) {
    const corrections = correctedStatuses.map((status) => `${status.from} → ${status.to}`).join(', ');
    effects.write(`amended via the status API: ${corrections}\n`);
  }

  const toggles = await applyBoardFeatures(request, configuration, plan);
  for (const toggle of toggles) {
    effects.write(`feature  ${toggle.feature} → ${toggle.to}\n`);
  }

  if (seedBacklog !== undefined) await seedTheBacklog(request, configuration, effects, projectKey, seedBacklog);

  const after = await readProjectConfiguration(request, projectKey);
  const report = buildVerificationReport(after, spec);
  effects.write(`\n${renderVerification(report, await readBoardColumnReport(request, after, spec))}\n`);

  return report.matches ? EXIT_OK : EXIT_MISMATCH;
}

// region | Helpers

/** Chooses the project to reconcile, which is the sole positional. */
function selectProjectKey(positionals: string[]): string {
  if (positionals.length > 1) throw new Error(`Expected one project key. Received ${positionals.length}.`);

  const [projectKey] = positionals;
  if (projectKey === undefined || projectKey === '') throw new Error('A project key is required.');

  return projectKey;
}

/** Moves every work item in one status off the board, reporting the call that puts them back. */
async function seedTheBacklog(
  request: Parameters<typeof listIssueKeys>[0],
  configuration: { board: { id: number } },
  effects: TbJiraEffects,
  projectKey: string,
  status: string,
): Promise<void> {
  const jql = `project = "${projectKey}" AND status = "${status}"`;
  const keys = await listIssueKeys(request, jql);
  if (keys.length === 0) {
    effects.write(`backlog  no '${status}' work items to move\n`);

    return;
  }

  const { moved } = await moveIssuesToBacklog(request, configuration.board.id, keys);
  effects.write(`backlog  moved ${moved} '${status}' work items off the board\n`);
  // The run prints no keys, and a move leaves an item's status alone, so the query still selects the same set.
  effects.write(
    `         undo: POST /rest/agile/1.0/board/${configuration.board.id}/issue, ${BOARD_MOVE_LIMIT} keys per call\n`,
  );
  effects.write(`         keys: ${jql}\n`);
}

// endregion | Helpers
