import { runAuth } from './runAuth.ts';
import {
  describeError,
  EXIT_KEYSTORE,
  fail,
  KeystoreError,
  succeed,
  type TbJiraEffects,
} from './subcommand-support.ts';

const ROOT_HELP = `Usage: tb-jira <subcommand> [options]

Manage the Jira API token that authenticates against a Jira Cloud site.

Subcommands:
  auth  Store, remove, and report the Jira API token

Options:
  -h, --help     Print this help; each subcommand takes its own --help
      --version  Print the installed version

Exit codes:
  0  The command succeeded
  1  No token is stored, or nothing was there to remove
  2  Usage or validation error
  3  The keychain could not be reached`;

/**
 * Runs the `tb-jira` command line, writing through the effects it is given and answering with the code to exit
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

    return fail(effects, describeError(error), args[0]);
  }
}

// region | Helpers

/** Routes the arguments to a subcommand, or answers the root command's own options. */
async function dispatch(args: string[], effects: TbJiraEffects): Promise<number> {
  const [command, ...rest] = args;

  if (command === 'auth') return await runAuth(rest, effects);
  if (command === '--help' || command === '-h') return succeed(effects, ROOT_HELP);
  if (command === '--version') return succeed(effects, effects.resolveVersion());
  if (command === undefined) return fail(effects, 'A subcommand is required.', command);

  return fail(effects, `Unknown ${command.startsWith('-') ? 'option' : 'subcommand'}: ${command}`, command);
}

// endregion | Helpers
