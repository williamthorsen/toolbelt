import { JiraRequestError } from '../3-candidate/JiraRequestError.ts';
import { JiraTransportError } from '../3-candidate/JiraTransportError.ts';
import { runAuth } from './runAuth.ts';
import { runConfigureProject } from './runConfigureProject.ts';
import {
  describeError,
  EXIT_KEYSTORE,
  EXIT_REQUEST,
  EXIT_TRANSPORT,
  fail,
  KeystoreError,
  succeed,
  type TbJiraEffects,
} from './subcommand-support.ts';

const ROOT_HELP = `Usage: tb-jira <subcommand> [options]

Reconcile a Jira Cloud project against a declarative spec, and manage the API token with which it authenticates.

Subcommands:
  auth               Store, remove, and report the Jira API token
  configure-project  Reconcile a project's statuses, workflow, and board features against a spec

Options:
  -h, --help     Print this help; each subcommand takes its own --help
      --version  Print the installed version

Exit codes:
  0  The command succeeded
  1  No token is stored, or nothing was there to remove
  2  Usage or validation error
  3  The keychain could not be reached
  4  A Jira request failed
  5  The run wrote, but the project does not match the spec
  6  Jira could not be reached

Jira Cloud and team-managed projects only.`;

/**
 * Runs the `tb-jira` command line, writing through the effects that it is given and returning the code to exit
 * with. Output streams as the run proceeds, so a process killed partway still leaves a record of what it did.
 * Every failure is reported through the effects: nothing throws.
 *
 * @internal
 */
export async function runTbJira(args: string[], effects: TbJiraEffects): Promise<number> {
  try {
    return await dispatch(args, effects);
  } catch (error) {
    if (error instanceof KeystoreError) {
      effects.writeError(`${error.message}\n`);

      return EXIT_KEYSTORE;
    }

    if (error instanceof JiraRequestError) {
      effects.writeError(`${error.message}\n`);

      return EXIT_REQUEST;
    }

    // A run that never reached Jira is retryable, and no help text can fix a network.
    if (error instanceof JiraTransportError) {
      effects.writeError(`${describeError(error)}\n`);

      return EXIT_TRANSPORT;
    }

    return fail(effects, describeError(error), args[0]);
  }
}

// region | Helpers

/** Routes the arguments to a subcommand, or handles the root command's own options. */
async function dispatch(args: string[], effects: TbJiraEffects): Promise<number> {
  const [command, ...rest] = args;

  if (command === 'auth') return await runAuth(rest, effects);
  if (command === 'configure-project') return await runConfigureProject(rest, effects);
  if (command === '--help' || command === '-h') return succeed(effects, ROOT_HELP);
  if (command === '--version') return succeed(effects, effects.resolveVersion());
  if (command === undefined) return fail(effects, 'A subcommand is required.', command);

  return fail(effects, `Unknown ${command.startsWith('-') ? 'option' : 'subcommand'}: ${command}`, command);
}

// endregion | Helpers
