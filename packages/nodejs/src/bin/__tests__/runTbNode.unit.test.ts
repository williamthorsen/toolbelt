import { describe, expect, it } from 'vitest';

import type { StrandedAsdfShim } from '../../3-candidate/listStrandedAsdfShims.ts';
import { runTbNode, type TbNodeEffects } from '../runTbNode.ts';

const DATA_DIR = '/Users/me/.asdf';
const EXEC_PATH = `${DATA_DIR}/installs/nodejs/24.20.0/bin/node`;
const VERSION = '9.9.9';

const NO_PROVIDER: StrandedAsdfShim = {
  backingPackage: 'pnpm',
  name: 'pn',
  otherProvider: undefined,
  providingVersions: ['24.18.1'],
  shimPath: `${DATA_DIR}/shims/pn`,
};

const ORPHAN: StrandedAsdfShim = {
  backingPackage: 'foo-cli',
  name: 'foo',
  otherProvider: '/opt/homebrew/bin/foo',
  providingVersions: ['22.14.0'],
  shimPath: `${DATA_DIR}/shims/foo`,
};

describe(runTbNode, () => {
  describe('asdf-shims', () => {
    it('reports a clean install on one line and exits 0', () => {
      expect(run([], [])).toStrictEqual({
        exitCode: 0,
        stderr: '',
        stdout: 'nodejs 24.20.0 (asdf): no stranded shims\n',
      });
    });

    it('reports a shim with no other provider, with the commands that provide and remove it, and exits 1', () => {
      expect(run([NO_PROVIDER], [])).toStrictEqual({
        exitCode: 1,
        stderr: '',
        stdout: [
          'nodejs 24.20.0 (asdf): 1 stranded shim in /Users/me/.asdf/shims',
          '',
          'pn: stranded, no other provider on PATH',
          '  provided by nodejs 24.18.1 (npm package pnpm)',
          '  to provide it under 24.20.0:',
          '    npm install --global pnpm',
          '    asdf reshim nodejs',
          '  to remove it:',
          '    ASDF_NODEJS_VERSION=24.18.1 npm uninstall --global pnpm',
          '    asdf reshim nodejs',
          '',
        ].join('\n'),
      });
    });

    it('reports an orphan with the removal commands alone, one per providing version', () => {
      const orphan = { ...ORPHAN, providingVersions: ['22.14.0', '20.19.0'] };

      expect(run([orphan], []).stdout).toBe(
        [
          'nodejs 24.20.0 (asdf): 1 stranded shim in /Users/me/.asdf/shims',
          '',
          'foo: orphan, shadows /opt/homebrew/bin/foo',
          '  provided by nodejs 22.14.0, 20.19.0 (npm package foo-cli)',
          '  to remove it:',
          '    ASDF_NODEJS_VERSION=22.14.0 npm uninstall --global foo-cli',
          '    ASDF_NODEJS_VERSION=20.19.0 npm uninstall --global foo-cli',
          '    asdf reshim nodejs',
          '',
        ].join('\n'),
      );
    });

    it('uses corepack rather than npm for a shim that corepack backs', () => {
      const shim = { ...NO_PROVIDER, backingPackage: 'corepack', name: 'yarn' };

      expect(run([shim], []).stdout).toContain(
        [
          '  to provide it under 24.20.0:',
          '    corepack enable',
          '    asdf reshim nodejs',
          '  to remove it:',
          '    ASDF_NODEJS_VERSION=24.18.1 corepack disable',
          '    asdf reshim nodejs',
        ].join('\n'),
      );
    });

    it('removes the executable itself where no package backs the shim, and offers no provide step', () => {
      const shim = { ...NO_PROVIDER, backingPackage: undefined, name: 'tool' };

      expect(run([shim], []).stdout).toBe(
        [
          'nodejs 24.20.0 (asdf): 1 stranded shim in /Users/me/.asdf/shims',
          '',
          'tool: stranded, no other provider on PATH',
          '  provided by nodejs 24.18.1',
          '  to remove it:',
          '    rm /Users/me/.asdf/installs/nodejs/24.18.1/bin/tool',
          '    asdf reshim nodejs',
          '',
        ].join('\n'),
      );
    });

    it('separates several shims with a blank line and pluralizes the count', () => {
      const { stdout } = run([ORPHAN, NO_PROVIDER], []);

      expect(stdout).toMatch(/^nodejs 24\.20\.0 \(asdf\): 2 stranded shims in /);
      expect(stdout).toContain('\n\nfoo: orphan');
      expect(stdout).toContain('\n\npn: stranded');
    });

    it('passes the install and PATH through to the detection', () => {
      let received: unknown;
      const effects = buildEffects([], ['/usr/bin', '/opt/homebrew/bin']);

      runTbNode(['asdf-shims'], {
        ...effects,
        listStrandedShims: (options) => {
          received = options;
          return [];
        },
      });

      expect(received).toStrictEqual({
        dataDir: DATA_DIR,
        pathDirs: ['/usr/bin', '/opt/homebrew/bin'],
        plugin: 'nodejs',
        version: '24.20.0',
      });
    });

    it.each(['/opt/homebrew/bin/node', `${DATA_DIR}/installs/python/3.13.1/bin/node`])(
      'exits 3 with the reason on stderr where node is not an asdf nodejs install: %s',
      (execPath) => {
        expect(runTbNode(['asdf-shims'], { ...buildEffects([], []), execPath })).toStrictEqual({
          exitCode: 3,
          stderr: `node at ${execPath} is not an asdf nodejs install; nothing to check.\n`,
          stdout: '',
        });
      },
    );

    it('rejects a positional and an unknown option with exit 2', () => {
      expect(runTbNode(['asdf-shims', 'extra'], buildEffects([], [])).exitCode).toBe(2);
      expect(runTbNode(['asdf-shims', '--all'], buildEffects([], []))).toMatchObject({
        exitCode: 2,
        stderr: expect.stringContaining('Try `tb-node asdf-shims --help`.'),
      });
    });
  });

  describe('help and version', () => {
    it.each([['--help'], ['-h']])('prints the root help on %o', (flag) => {
      const { exitCode, stdout } = runTbNode([flag], buildEffects([], []));

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage: tb-node <subcommand>');
      expect(stdout).toContain('asdf-shims');
    });

    it.each([['--help'], ['-h']])('prints the subcommand help on %o', (flag) => {
      const { exitCode, stdout } = runTbNode(['asdf-shims', flag], buildEffects([], []));

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage: tb-node asdf-shims');
      expect(stdout).toContain('asdf reshim nodejs');
    });

    it('prints the version', () => {
      expect(runTbNode(['--version'], buildEffects([], []))).toStrictEqual({
        exitCode: 0,
        stderr: '',
        stdout: `${VERSION}\n`,
      });
    });
  });

  describe('usage errors', () => {
    it.each([
      [[], 'A subcommand is required.'],
      [['frobnicate'], 'Unknown subcommand: frobnicate'],
      [['--frobnicate'], 'Unknown option: --frobnicate'],
    ])('exits 2 pointing at the root help: %o', (args, message) => {
      expect(runTbNode(args, buildEffects([], []))).toStrictEqual({
        exitCode: 2,
        stderr: `${message}\nTry \`tb-node --help\`.\n`,
        stdout: '',
      });
    });
  });
});

// region | Helpers

/** Builds effects under an asdf-managed node 24.20.0 whose detection returns the given shims. */
function buildEffects(shims: StrandedAsdfShim[], pathDirs: string[]): TbNodeEffects {
  return {
    execPath: EXEC_PATH,
    listStrandedShims: () => shims,
    pathDirs,
    resolveVersion: () => VERSION,
  };
}

/** Runs `asdf-shims` under effects whose detection returns the given shims. */
function run(shims: StrandedAsdfShim[], pathDirs: string[]) {
  return runTbNode(['asdf-shims'], buildEffects(shims, pathDirs));
}

// endregion | Helpers
