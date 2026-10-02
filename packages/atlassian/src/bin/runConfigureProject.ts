import { parseArgs } from 'node:util';

import { applyBoardFeatures } from '../3-candidate/applyBoardFeatures.ts';
import { applyWorkflowUpdate } from '../3-candidate/applyWorkflowUpdate.ts';
import { buildReconciliationPlan } from '../3-candidate/buildReconciliationPlan.ts';
import { buildVerificationReport } from '../3-candidate/buildVerificationReport.ts';
import { listIssueKeys } from '../3-candidate/listIssueKeys.ts';
import { moveIssuesToBacklog } from '../3-candidate/moveIssuesToBacklog.ts';
import { readBoardColumnReport } from '../3-candidate/readBoardColumnReport.ts';
import { readProjectConfiguration } from '../3-candidate/readProjectConfiguration.ts';
import { DEFAULT_TOKEN_SERVICE } from '../internal/jiraTokenChain.ts';
import { createSubcommandRequest, CREDENTIAL_OPTIONS } from './createSubcommandRequest.ts';
import { formatContinuationLine, formatLabelledLine } from './labelled-lines.ts';
import { loadProjectSpec } from './loadProjectSpec.ts';
import { renderPlan } from './renderPlan.ts';
import { renderVerification } from './renderVerification.ts';
import { EXIT_MISMATCH, EXIT_OK, succeed, type TbJiraEffects } from './subcommand-support.ts';

/**
 * What `POST /rest/agile/1.0/board/{boardId}/issue` accepts in one call, which bounds the undo that the
 * seed prints.
 */
const BOARD_MOVE_LIMIT = 50;

const CONFIGURE_HELP = `Usage: tb-jira configure-project <KEY> [options]

Reconcile a Jira project's statuses, workflow transitions, and board features against a declarative spec, then
report what the server stores afterwards. The run is idempotent: A project already matching the spec is left
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

Resolution orders, each stopping at the first source that supplies a value:
  site   --site, then JIRA_SITE, then the spec's \`site\`
  email  --email, then JIRA_EMAIL, then the spec's \`email\`
  token  --token-stdin, then JIRA_API_TOKEN, then --token-command, then the macOS keychain

The token is read from the keychain under the service \`${DEFAULT_TOKEN_SERVICE}\`, with the email as the
account. Store one with \`tb-jira auth set\`. The base URL is the \`api.atlassian.com\` gateway, whose cloudId
is read from the site without authentication.

Jira Cloud and team-managed projects only. A company-managed project is refused rather than reconciled: A
status renamed there is renamed in every project on the site that uses it.

Board columns cannot be set through the public API. The closing report names any spec status mapped to no
column, and any column order differing from the spec's; both are fixed by dragging in the board settings.

A board feature locked by Jira is reported as \`locked\` in the plan and \`LOCK\` in the closing report, and is
never written: The call would return 200 and change nothing. Neither it nor a column gap affects the exit code.`;

/**
 * Runs the `configure-project` subcommand: It resolves the credential, plans the reconciliation against the
 * project's live configuration, writes what the plan contains, and reports what the server stores afterwards.
 *
 * @internal
 */
export async function runConfigureProject(args: string[], effects: TbJiraEffects): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      ...CREDENTIAL_OPTIONS,
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
      'seed-backlog': { type: 'string' },
    },
    strict: true,
  });

  if (values.help === true) return succeed(effects, CONFIGURE_HELP);

  const projectKey = selectProjectKey(positionals);
  const seedBacklog = values['seed-backlog'];
  const loaded = loadProjectSpec(effects, values.spec);
  if (loaded === undefined) {
    throw new Error(`No jira-project-spec.json at or above ${effects.cwd()}. Name one with --spec.`);
  }
  const { spec } = loaded;

  const request = await createSubcommandRequest(effects, values, spec);

  const configuration = await readProjectConfiguration(request, projectKey);
  const plan = buildReconciliationPlan(spec, configuration);
  effects.write(`${renderPlan(plan, configuration, { projectKey, seedBacklog })}\n`);

  if (values['dry-run']) {
    effects.write('\ndry run: Nothing was written\n');

    return EXIT_OK;
  }

  const { correctedStatuses, written } = await applyWorkflowUpdate(request, configuration, plan);
  const workflowOutcome = written
    ? `updated: ${plan.statusUpdates.length} amended, ${plan.creations.length} created`
    : 'unchanged';
  effects.write(`${formatLabelledLine('workflow', workflowOutcome)}\n`);
  if (correctedStatuses.length > 0) {
    const corrections = correctedStatuses.map((status) => `${status.from} → ${status.to}`).join(', ');
    effects.write(`amended via the status API: ${corrections}\n`);
  }

  const toggles = await applyBoardFeatures(request, configuration, plan);
  for (const toggle of toggles) {
    effects.write(`${formatLabelledLine('feature', `${toggle.feature} → ${toggle.to}`)}\n`);
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
    effects.write(`${formatLabelledLine('backlog', `no '${status}' work items to move`)}\n`);

    return;
  }

  const { moved } = await moveIssuesToBacklog(request, configuration.board.id, keys);
  effects.write(`${formatLabelledLine('backlog', `moved ${moved} '${status}' work items off the board`)}\n`);
  // The run prints no keys, and a move leaves an item's status alone, so the query still selects the same set.
  effects.write(
    `${formatContinuationLine(`undo: POST /rest/agile/1.0/board/${configuration.board.id}/issue, ${BOARD_MOVE_LIMIT} keys per call`)}\n`,
  );
  effects.write(`${formatContinuationLine(`keys: ${jql}`)}\n`);
}

// endregion | Helpers
