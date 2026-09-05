import { parseArgs } from 'node:util';

import { findJiraTokenSource, type JiraTokenSource } from '../3-candidate/findJiraTokenSource.ts';
import { resolveJiraEmail } from '../3-candidate/resolveJiraEmail.ts';
import { DEFAULT_TOKEN_SERVICE } from '../internal/jiraTokenChain.ts';
import {
  callKeystore,
  createDeferredStore,
  EXIT_NO_RESULT,
  EXIT_OK,
  stripOneTrailingNewline,
  succeed,
  type TbJiraEffects,
} from './subcommand-support.ts';

const SOURCE_DESCRIPTIONS: Record<JiraTokenSource, string> = {
  command: 'the configured token command',
  env: 'the JIRA_API_TOKEN environment variable',
  keychain: 'the macOS keychain',
  supplied: 'a supplied value',
};

const AUTH_HELP = `Usage: tb-jira auth <delete|set|status> [options]

Manage the Jira API token. It is held in the macOS keychain under the service \`${DEFAULT_TOKEN_SERVICE}\`,
with the Atlassian account email as the account, which is the same item that \`tb-secret\` reads and writes.
\`delete\` and \`set\` require macOS. \`status\` opens the keychain only where the earlier sources miss.

Subcommands:
  delete  Remove the stored token, exiting 1 where none is stored
  set     Store a token, replacing one already held under the same email
  status  Report which source would supply the token, printing the token nowhere

Options:
  -h, --help                 Print this help
      --email <address>      Atlassian account email (default: $JIRA_EMAIL)
      --service <name>       Keychain service (default: ${DEFAULT_TOKEN_SERVICE})
      --token-command <cmd>  status only: the shell line to probe as the command source

At a terminal, \`set\` prompts for the token twice and echoes nothing; piped, it reads stdin and drops one
trailing newline, since \`echo\` adds one.

\`status\` names the first of JIRA_API_TOKEN, a configured command, and the keychain that would answer. It
probes the keychain for presence rather than reading it, so it raises no keychain access prompt; a configured
command does run, and its output is discarded.`;

/**
 * Runs the `auth` subcommand, which stores, removes, and reports the token that the Jira transport
 * authenticates with.
 *
 * @internal
 */
export async function runAuth(args: string[], effects: TbJiraEffects): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      email: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      service: { type: 'string' },
      'token-command': { type: 'string' },
    },
    strict: true,
  });

  if (values.help === true) return succeed(effects, AUTH_HELP);

  const command = selectCommand(positionals);
  const account = resolveJiraEmail({ email: values.email, env: effects.env });
  const service = values.service ?? DEFAULT_TOKEN_SERVICE;

  if (command === 'delete') return runDelete(effects, account, service);
  if (command === 'set') return await runSet(effects, account, service);

  return runStatus(effects, account, service, values['token-command']);
}

// region | Helpers

/** Removes the stored token, reporting through the exit code whether one was there. */
function runDelete(effects: TbJiraEffects, account: string, service: string): number {
  const removed = callKeystore(() => effects.createStore().deleteSecret({ account, service }));
  if (!removed) return EXIT_NO_RESULT;

  return succeed(effects, `Removed the token for ${account}.`);
}

/**
 * Stores a token, read from the terminal without echo or from stdin where the input is piped. The store is
 * opened first, so a platform holding no keychain is reported before a token is typed into this process.
 */
async function runSet(effects: TbJiraEffects, account: string, service: string): Promise<number> {
  const store = callKeystore(() => effects.createStore());
  const token = effects.isStdinTty() ? await effects.promptSecret() : stripOneTrailingNewline(effects.readStdin());

  callKeystore(() => store.setSecret({ account, service }, token));

  return succeed(effects, `Stored a token for ${account} under ${service}.`);
}

/** Reports which source would supply the token, naming it rather than printing what it holds. */
function runStatus(effects: TbJiraEffects, account: string, service: string, tokenCommand: string | undefined): number {
  const source = findJiraTokenSource({
    account,
    env: effects.env,
    service,
    store: createDeferredStore(effects),
    tokenCommand,
  });

  if (source === undefined) {
    effects.write(`No token would be found for ${account} under ${service}.\n`);

    return EXIT_NO_RESULT;
  }

  effects.write(`A token for ${account} would come from ${SOURCE_DESCRIPTIONS[source]}.\n`);

  return EXIT_OK;
}

/** Chooses the operation to run, which is the sole positional. */
function selectCommand(positionals: string[]): 'delete' | 'set' | 'status' {
  if (positionals.length > 1) throw new Error(`Expected one subcommand. Received ${positionals.length}.`);

  const [command] = positionals;
  if (command === undefined) throw new Error('A subcommand is required: delete, set, or status.');
  if (command !== 'delete' && command !== 'set' && command !== 'status') {
    throw new Error(`Unknown subcommand: ${command}`);
  }

  return command;
}

// endregion | Helpers
