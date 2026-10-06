import path from 'node:path';

import { createCli, runCli, UsageError, type Writer } from '@williamthorsen/toolbelt.cli/candidate';

import { type AsdfInstall, findAsdfInstall } from '../3-candidate/findAsdfInstall.ts';
import type { findPackageManagerPin } from '../3-candidate/findPackageManagerPin.ts';
import type { listStrandedAsdfShims, StrandedAsdfShim } from '../3-candidate/listStrandedAsdfShims.ts';
import { parsePackageManagerSpec } from '../3-candidate/parsePackageManagerSpec.ts';
import type { PnpmProvider, resolvePnpmProvider } from './resolvePnpmProvider.ts';

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_NOT_APPLICABLE = 3;

const COREPACK = 'corepack';
const PLUGIN = 'nodejs';
const PNPM = 'pnpm';
const RESHIM = 'asdf reshim nodejs';

const { defineCommand, defineGroup } = createCli<TbNodeEffects>();

const EXIT_CODES = `Exit codes:
  0  The check found nothing to fix
  1  The check found something to fix
  2  Usage or validation error
  3  The check does not apply; the reason is on stderr`;

const ASDF_SHIMS_DESCRIPTION = `Report every asdf shim that names the nodejs plugin but not the active version. Such a shim stays on PATH and
fails when invoked. Each is classified as an orphan, which shadows another executable of that name on PATH, or
as having no other provider, and the commands that provide or remove it are printed. A shim that an installed
version of another asdf plugin also provides is not reported, since asdf may resolve the command there.`;

const ASDF_SHIMS_EPILOG = `The active version is the one running this command, read from its install path, so the check spawns nothing
and needs no repository. It exits 1 when a shim is stranded, 0 when none is, and 3 when node is not an asdf
install.

The printed remedies use \`asdf reshim nodejs\`, which regenerates every shim from the installed versions,
rather than \`asdf reshim nodejs <version>\`, which merges into an existing shim and keeps stale lines.`;

const PNPM_DESCRIPTION = `Check the pnpm that runs in the working directory against the packageManager pin of the nearest package.json
declaring one, from the working directory upward, and name what provides the pnpm on PATH: the asdf pnpm plugin,
corepack or an npm-global pnpm under a nodejs version, an asdf shim stranded under the running node, or otherwise
its path.`;

const PNPM_EPILOG = `The version that runs is read by running \`pnpm --version\` in the pinned directory, the one process that this
command spawns: pnpm 10 and later switch themselves to the pinned version whatever provides them, and corepack
selects it, so a version read from the filesystem would report the installed pnpm and a mismatch that does not
exist. That run may download the pinned version on first use.

It prints repair commands only when the versions differ, and they install the pin through whatever provides
pnpm now.

It exits 1 when the versions differ, when pnpm reported no version, or when pnpm is not on PATH; 0 when they
match; and 3, with the reason on stderr, when no pin is in reach or the pin names another package manager.`;

const ROOT = defineGroup({
  summary: 'Utilities for inspecting the Node.js runtime and the commands that it installs.',
  epilog: EXIT_CODES,
  commands: {
    'asdf-shims': defineCommand({
      summary: 'Report asdf node shims that the active nodejs version does not provide',
      description: ASDF_SHIMS_DESCRIPTION,
      epilog: ASDF_SHIMS_EPILOG,
      run: ({ context, stderr, stdout }) => reportFailures(() => writeResult(runAsdfShims(context), stdout, stderr)),
    }),
    [PNPM]: defineCommand({
      summary: 'Check the pnpm that runs here against the nearest packageManager pin',
      description: PNPM_DESCRIPTION,
      epilog: PNPM_EPILOG,
      run: ({ context, stderr, stdout }) => reportFailures(() => writeResult(runPnpm(context), stdout, stderr)),
    }),
  },
});

/**
 * Runs the `tb-node` command line, returning what to write and exit with rather than doing either, so that
 * the whole surface is exercisable without a process. Every failure is reported through the result: Nothing throws.
 *
 * @internal
 */
export async function runTbNode(args: string[], effects: TbNodeEffects): Promise<TbNodeResult> {
  const stdout = createTextBuffer();
  const stderr = createTextBuffer();
  const exitCode = await runCli(args, ROOT, {
    name: 'tb-node',
    context: effects,
    version: () => resolveVersion(effects),
    stdout,
    stderr,
  });

  return { exitCode, stderr: stderr.text, stdout: stdout.text };
}

/** What running `pnpm --version` produced: the version that it printed, or why it produced none. */
export type PnpmVersionResult = { readonly failure: string } | { readonly version: string };

/** The effects deferred to the entry point, which keeps the runner free of I/O. */
export interface TbNodeEffects {
  /** The working directory, from which the pin and the `.tool-versions` lookups ascend. */
  readonly cwd: string;
  /** The path of the node binary running the command, from which its asdf install is read. */
  readonly execPath: string;
  /** Finds the `packageManager` pin governing a directory. */
  readonly findPin: typeof findPackageManagerPin;
  readonly homeDir: string;
  /** Lists the shims that the active version does not provide. */
  readonly listStrandedShims: typeof listStrandedAsdfShims;
  /** The directories of PATH, in search order. */
  readonly pathDirs: readonly string[];
  /** Classifies the `pnpm` on PATH by what provides it. */
  readonly resolvePnpmProvider: typeof resolvePnpmProvider;
  readonly resolveVersion: () => string;
  /** Runs `pnpm --version` in a directory; the one process that the runner asks for. Never throws. */
  readonly runPnpmVersion: (dir: string) => PnpmVersionResult;
}

/** What the caller should write to each stream and exit with. */
export interface TbNodeResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

// region | Helpers

/** Returns a writer that accumulates what is written to it. */
function createTextBuffer(): Writer & { readonly text: string } {
  let text = '';

  return {
    get text() {
      return text;
    },
    write(chunk: string) {
      text += chunk;
    },
  };
}

/** Renders the line naming the `pnpm` on PATH and what provides it. */
function describeProvider(provider: PnpmProvider, execPath: string): string {
  if (provider.kind === 'absent') return 'pnpm on PATH: none';

  return `pnpm on PATH: ${provider.path}${describeProviderKind(provider, execPath)}`;
}

/** Renders what provides a found `pnpm`, led by the separator, or nothing when only its path is known. */
function describeProviderKind(provider: Exclude<PnpmProvider, { kind: 'absent' }>, execPath: string): string {
  switch (provider.kind) {
    case 'asdf-plugin': {
      const selection = provider.toolVersions === undefined ? '' : ` (selected by ${provider.toolVersions.filePath})`;

      return `, asdf pnpm plugin${selection}`;
    }
    case 'corepack':
    case 'npm-global': {
      const label = provider.kind === COREPACK ? COREPACK : 'npm-global pnpm';

      return provider.nodeVersion === undefined ? `, ${label}` : `, ${label} under ${PLUGIN} ${provider.nodeVersion}`;
    }
    case 'path':
      return '';
    case 'stranded-shim': {
      const providers = `provided by ${PLUGIN} ${provider.providingVersions.join(', ')}`;
      const install = findAsdfInstall(execPath);

      return install === undefined || install.plugin !== PLUGIN
        ? `, asdf shim ${providers}, while node at ${execPath} is not an asdf install`
        : `, asdf shim stranded under ${PLUGIN} ${install.version}, ${providers}; see tb-node asdf-shims`;
    }
  }
}

/**
 * Renders the commands that install the pinned pnpm through what provides pnpm now. A provider under asdf
 * gets a reshim after a global install, so that the shim picks the command up.
 */
function listPnpmRepairs(provider: PnpmProvider, version: string, pinDir: string, execPath: string): string[] {
  const globalInstall = `npm install --global ${PNPM}@${version}`;
  const reshim = findAsdfInstall(execPath)?.plugin === PLUGIN ? [RESHIM] : [];

  switch (provider.kind) {
    case 'absent':
    case 'npm-global':
    case 'stranded-shim':
      return [globalInstall, ...reshim];
    case 'asdf-plugin': {
      const selection =
        provider.toolVersions === undefined
          ? `add ${PNPM} ${version} to ${path.join(pinDir, '.tool-versions')}`
          : `set ${PNPM} ${version} in ${provider.toolVersions.filePath}`;

      return [`asdf install ${PNPM} ${version}`, selection];
    }
    case 'corepack':
      return [`${COREPACK} install`];
    case 'path':
      return [`install ${PNPM}@${version} where pnpm comes from: ${provider.path}`];
  }
}

/**
 * Renders the commands that put the command under the active version, or nothing when the package is unknown.
 * When the active version has no corepack to run, the commands for a shim that corepack backs start by installing it.
 */
function listProvideCommands(shim: StrandedAsdfShim, lacksCorepack: boolean): string[] {
  if (shim.backingPackage === undefined) return [];
  if (shim.backingPackage !== COREPACK) return [`npm install --global ${shim.backingPackage}`, RESHIM];

  const installCorepack = lacksCorepack ? [`npm install --global ${COREPACK}`, RESHIM] : [];

  return shim.name === COREPACK && lacksCorepack ? installCorepack : [...installCorepack, 'corepack enable', RESHIM];
}

/** Renders the commands that remove the command from every providing version, so that reshimming removes the shim. */
function listRemoveCommands(shim: StrandedAsdfShim, install: AsdfInstall): string[] {
  const commands = shim.providingVersions.map((version) => {
    if (shim.backingPackage === undefined) {
      return `rm ${path.join(install.dataDir, 'installs', PLUGIN, version, 'bin', shim.name)}`;
    }
    if (shim.backingPackage === COREPACK) return `ASDF_NODEJS_VERSION=${version} corepack disable`;

    return `ASDF_NODEJS_VERSION=${version} npm uninstall --global ${shim.backingPackage}`;
  });

  return [...commands, RESHIM];
}

/** Renders the report of the stranded shims found under an install. */
function renderReport(install: AsdfInstall, shims: readonly StrandedAsdfShim[]): string {
  const shimsDir = path.join(install.dataDir, 'shims');
  const count = shims.length === 1 ? '1 stranded shim' : `${shims.length} stranded shims`;
  const headline = `${PLUGIN} ${install.version} (asdf): ${shims.length === 0 ? 'no stranded shims' : `${count} in ${shimsDir}`}`;

  // A stranded `corepack` shim means that the active version includes no corepack, as node 25 and later do not.
  const lacksCorepack = shims.some((shim) => shim.name === COREPACK);

  return [headline, ...shims.map((shim) => renderShim(shim, install, lacksCorepack))].join('\n\n');
}

/** Renders one stranded shim: its class, its providers, and the commands that provide or remove it. */
function renderShim(shim: StrandedAsdfShim, install: AsdfInstall, lacksCorepack: boolean): string {
  const status =
    shim.otherProvider === undefined ? 'stranded, no other provider on PATH' : `orphan, shadows ${shim.otherProvider}`;
  const backing = shim.backingPackage === undefined ? '' : ` (npm package ${shim.backingPackage})`;
  const lines = [`${shim.name}: ${status}`, `  provided by ${PLUGIN} ${shim.providingVersions.join(', ')}${backing}`];

  const provideCommands = shim.otherProvider === undefined ? listProvideCommands(shim, lacksCorepack) : [];
  if (provideCommands.length > 0) {
    lines.push(`  to provide it under ${install.version}:`, ...provideCommands.map((command) => `    ${command}`));
  }
  lines.push('  to remove it:', ...listRemoveCommands(shim, install).map((command) => `    ${command}`));

  return lines.join('\n');
}

/** Reports a check's outcome on stdout, one line per entry, with the exit code for that outcome. */
function report(exitCode: number, lines: readonly string[]): TbNodeResult {
  return { exitCode, stderr: '', stdout: `${lines.join('\n')}\n` };
}

/** Runs a command's body, reporting anything that it throws as a usage error, which exits 2 with a pointer to help. */
async function reportFailures(body: () => number | Promise<number>): Promise<number> {
  try {
    return await body();
  } catch (error) {
    if (error instanceof UsageError) throw error;

    throw new UsageError(error instanceof Error ? error.message : String(error), { cause: error });
  }
}

/** Reports a check that does not apply: the reason on stderr, and whatever was learned on stdout. */
function reportNotApplicable(reason: string, stdout: string): TbNodeResult {
  return { exitCode: EXIT_NOT_APPLICABLE, stderr: `${reason}\n`, stdout: `${stdout}\n` };
}

/** Resolves the installed version, reporting a failure as a usage error, which exits 2. */
function resolveVersion(effects: { readonly resolveVersion: () => string }): string {
  try {
    return effects.resolveVersion();
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error), { cause: error });
  }
}

/** Reports the shims that the active version does not provide. */
function runAsdfShims(effects: TbNodeEffects): TbNodeResult {
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

/**
 * Checks the pnpm that runs in the working directory against the nearest `packageManager` pin, naming the provider
 * either way and printing repairs only when the versions differ.
 */
function runPnpm(effects: TbNodeEffects): TbNodeResult {
  const { cwd, execPath } = effects;
  const provider = effects.resolvePnpmProvider({ cwd, execPath, homeDir: effects.homeDir, pathDirs: effects.pathDirs });
  const providerLine = describeProvider(provider, execPath);

  const pin = effects.findPin(cwd);
  if (pin === undefined) {
    return reportNotApplicable(
      `No package.json declaring packageManager at or above ${cwd}; nothing to check.`,
      providerLine,
    );
  }
  const spec = parsePackageManagerSpec(pin.spec);
  if (spec === undefined) {
    return reportNotApplicable(
      `packageManager ${pin.spec} in ${pin.manifestPath} is not <name>@<version>; nothing to check.`,
      providerLine,
    );
  }
  if (spec.name !== PNPM) {
    return reportNotApplicable(
      `packageManager in ${pin.manifestPath} is ${spec.name}, not ${PNPM}; nothing to check.`,
      providerLine,
    );
  }

  const pinLabel = `packageManager ${PNPM}@${spec.version} in ${pin.manifestPath}`;
  const repairs = [
    '  to run the pinned version:',
    ...listPnpmRepairs(provider, spec.version, pin.dir, execPath).map((command) => `    ${command}`),
  ];

  if (provider.kind === 'absent') {
    return report(EXIT_FINDINGS, [`pnpm is not on PATH; ${pinLabel} cannot run`, `  ${providerLine}`, ...repairs]);
  }

  const result = effects.runPnpmVersion(pin.dir);
  if ('failure' in result) {
    const headline = `pnpm reported no version (${result.failure}); ${pinLabel} did not run`;

    return report(EXIT_FINDINGS, [headline, `  ${providerLine}`, ...repairs]);
  }
  if (result.version === spec.version) {
    return report(EXIT_OK, [`pnpm ${result.version} matches ${pinLabel}`, `  ${providerLine}`]);
  }

  return report(EXIT_FINDINGS, [`pnpm ${result.version} does not match ${pinLabel}`, `  ${providerLine}`, ...repairs]);
}

/** Writes a check's result to the streams and returns its exit code. */
function writeResult(result: TbNodeResult, stdout: Writer, stderr: Writer): number {
  if (result.stdout !== '') stdout.write(result.stdout);
  if (result.stderr !== '') stderr.write(result.stderr);

  return result.exitCode;
}

// endregion | Helpers
