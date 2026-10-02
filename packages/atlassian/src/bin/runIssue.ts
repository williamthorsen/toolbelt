import { runIssueList } from './runIssueList.ts';
import { succeed, type TbJiraEffects } from './subcommand-support.ts';

const ISSUE_HELP = `Usage: tb-jira issue <list> [options]

Work with a Jira project's work items.

Subcommands:
  list  List a project's work items, newest first

Options:
  -h, --help  Print this help; each subcommand takes its own --help`;

/**
 * Runs the `issue` command group, passing the arguments to the subcommand that they name.
 *
 * @internal
 */
export async function runIssue(args: string[], effects: TbJiraEffects): Promise<number> {
  const [command, ...rest] = args;

  if (command === 'list') return await runIssueList(rest, effects);
  if (command === '--help' || command === '-h') return succeed(effects, ISSUE_HELP);
  if (command === undefined) throw new Error('A subcommand is required: list.');

  throw new Error(`Unknown ${command.startsWith('-') ? 'option' : 'subcommand'}: ${command}`);
}
