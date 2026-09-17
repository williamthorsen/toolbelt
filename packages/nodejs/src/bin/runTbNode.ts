import path from 'node:path';
import { parseArgs } from 'node:util';

import { type AsdfInstall, findAsdfInstall } from '../3-candidate/findAsdfInstall.ts';
import type { listStrandedAsdfShims, StrandedAsdfShim } from '../3-candidate/listStrandedAsdfShims.ts';

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_USAGE = 2;
const EXIT_NOT_APPLICABLE = 3;

const PLUGIN = 'nodejs';
const RESHIM = 'asdf reshim nodejs';

const SUBCOMMANDS = new Set(['asdf-shims']);

const HELP_OPTION = { help: { type: 'boolean', short: 'h' } } as const;

const ROOT_HELP = `Usage: tb-node <subcommand> [options]

Utilities for inspecting the Node.js runtime and the commands that it installs.

Subcommands:
  asdf-shims  Report asdf node shims that the active nodejs version does not provide

Options:
  -h, --help     Print this help; each subcommand takes its own --help
      --version  Print the installed version

Exit codes:
  0  The check found nothing to fix
  1  The check found something to fix
  2  Usage or validation error
  3  The check does not apply: the running node is not an asdf install`;

const ASDF_SHIMS_HELP = `Usage: tb-node asdf-shims [options]

Report every asdf shim that names the nodejs plugin but not the active version. Such a shim stays on PATH and
fails when invoked. Each is classified as an orphan, which shadows another executable of that name on PATH, or
as having no other provider, and the commands that provide or remove it are printed.

The active version is the one running this command, read from its install path, so the check spawns nothing
and needs no repository. It exits 1 where a shim is stranded, 0 where none is, and 3 where node is not an asdf
install.

\`asdf reshim nodejs\` regenerates every shim from the installed versions, whereas \`asdf reshim nodejs <version>\`
merges into an existing shim and keeps stale lines, so the printed remedies use the first form.

Options:
  -h, --help  Print this help`;

/**
 * Runs the `tb-node` command line, returning what to write and exit with rather than doing either, so the
 * whole surface is exercisable without a process. Every failure is reported through the result: Nothing throws.
 *
 * @internal
 */
export function runTbNode(args: string[], effects: TbNodeEffects): TbNodeResult {
  try {
    return dispatch(args, effects);
  } catch (error) {
    return fail(describeError(error), args[0]);
  }
}

/** The effects deferred to the entry point, which keeps the runner free of I/O. */
export interface TbNodeEffects {
  /** The path of the node binary running the command, from which its asdf install is read. */
  readonly execPath: string;
  /** Lists the shims that the active version does not provide; the one filesystem read the runner makes. */
  readonly listStrandedShims: typeof listStrandedAsdfShims;
  /** The directories of PATH, in search order. */
  readonly pathDirs: readonly string[];
  readonly resolveVersion: () => string;
}

/** What the caller should write to each stream and exit with. */
export interface TbNodeResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

// region | Helpers

/** Extracts the message from an unknown thrown value. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Routes the arguments to a subcommand, or handles the root command's own options. */
function dispatch(args: string[], effects: TbNodeEffects): TbNodeResult {
  const [command, ...rest] = args;

  if (command === 'asdf-shims') return runAsdfShims(rest, effects);
  if (command === '--help' || command === '-h') return succeed(ROOT_HELP);
  if (command === '--version') return succeed(effects.resolveVersion());
  if (command === undefined) return fail('A subcommand is required.', command);

  return fail(`Unknown ${command.startsWith('-') ? 'option' : 'subcommand'}: ${command}`, command);
}

/** Reports a usage or validation failure, pointing at the help of whichever command was invoked. */
function fail(message: string, command: string | undefined): TbNodeResult {
  const scope = command !== undefined && SUBCOMMANDS.has(command) ? `tb-node ${command}` : 'tb-node';

  return { exitCode: EXIT_USAGE, stderr: `${message}\nTry \`${scope} --help\`.\n`, stdout: '' };
}

/** Renders the commands that put the command under the active version, or nothing where the package is unknown. */
function listProvideCommands(shim: StrandedAsdfShim): string[] {
  if (shim.backingPackage === undefined) return [];
  if (shim.backingPackage === 'corepack') return ['corepack enable', RESHIM];

  return [`npm install --global ${shim.backingPackage}`, RESHIM];
}

/** Renders the commands that remove the command from every providing version, so the shim goes on reshim. */
function listRemoveCommands(shim: StrandedAsdfShim, install: AsdfInstall): string[] {
  const commands = shim.providingVersions.map((version) => {
    if (shim.backingPackage === undefined) {
      return `rm ${path.join(install.dataDir, 'installs', PLUGIN, version, 'bin', shim.name)}`;
    }
    if (shim.backingPackage === 'corepack') return `ASDF_NODEJS_VERSION=${version} corepack disable`;

    return `ASDF_NODEJS_VERSION=${version} npm uninstall --global ${shim.backingPackage}`;
  });

  return [...commands, RESHIM];
}

/** Renders the report of the stranded shims found under an install. */
function renderReport(install: AsdfInstall, shims: readonly StrandedAsdfShim[]): string {
  const shimsDir = path.join(install.dataDir, 'shims');
  const count = shims.length === 1 ? '1 stranded shim' : `${shims.length} stranded shims`;
  const headline = `${PLUGIN} ${install.version} (asdf): ${shims.length === 0 ? 'no stranded shims' : `${count} in ${shimsDir}`}`;

  return [headline, ...shims.map((shim) => renderShim(shim, install))].join('\n\n');
}

/** Renders one stranded shim: its class, its providers, and the commands that provide or remove it. */
function renderShim(shim: StrandedAsdfShim, install: AsdfInstall): string {
  const status =
    shim.otherProvider === undefined ? 'stranded, no other provider on PATH' : `orphan, shadows ${shim.otherProvider}`;
  const backing = shim.backingPackage === undefined ? '' : ` (npm package ${shim.backingPackage})`;
  const lines = [`${shim.name}: ${status}`, `  provided by ${PLUGIN} ${shim.providingVersions.join(', ')}${backing}`];

  const provideCommands = shim.otherProvider === undefined ? listProvideCommands(shim) : [];
  if (provideCommands.length > 0) {
    lines.push(`  to provide it under ${install.version}:`, ...provideCommands.map((command) => `    ${command}`));
  }
  lines.push('  to remove it:', ...listRemoveCommands(shim, install).map((command) => `    ${command}`));

  return lines.join('\n');
}

/** Parses the `asdf-shims` subcommand and reports the shims that the active version does not provide. */
function runAsdfShims(args: string[], effects: TbNodeEffects): TbNodeResult {
  const { values } = parseArgs({ allowPositionals: false, args, options: HELP_OPTION, strict: true });

  if (values.help) return succeed(ASDF_SHIMS_HELP);

  const install = findAsdfInstall(effects.execPath);
  if (install === undefined || install.plugin !== PLUGIN) {
    return {
      exitCode: EXIT_NOT_APPLICABLE,
      stderr: `node at ${effects.execPath} is not an asdf ${PLUGIN} install; nothing to check.\n`,
      stdout: '',
    };
  }

  const shims = effects.listStrandedShims({
    dataDir: install.dataDir,
    pathDirs: effects.pathDirs,
    plugin: PLUGIN,
    version: install.version,
  });

  return {
    exitCode: shims.length === 0 ? EXIT_OK : EXIT_FINDINGS,
    stderr: '',
    stdout: `${renderReport(install, shims)}\n`,
  };
}

/** Reports a printed result, terminating the line written by the caller. */
function succeed(output: string): TbNodeResult {
  return { exitCode: EXIT_OK, stderr: '', stdout: `${output}\n` };
}

// endregion | Helpers
