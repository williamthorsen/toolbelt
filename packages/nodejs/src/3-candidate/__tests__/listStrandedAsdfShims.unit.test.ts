import fs from 'node:fs';

import { createTempTree, type TempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { listStrandedAsdfShims } from '../listStrandedAsdfShims.ts';

const ACTIVE = '24.20.0';
const OLD = '24.18.1';

describe(listStrandedAsdfShims, () => {
  it('reports a shim that no other PATH directory provides, naming its backing package', () => {
    using tree = createTempTree({ 'shims/pn': renderShim('pn', ['nodejs 24.18.1']) });
    linkBin(tree, OLD, 'pn', '../lib/node_modules/pnpm/bin/pnpm.mjs');

    expect(listStrandedAsdfShims(buildOptions(tree))).toStrictEqual([
      {
        backingPackage: 'pnpm',
        name: 'pn',
        otherProvider: undefined,
        providingVersions: [OLD],
        shimPath: tree.resolve('shims/pn'),
      },
    ]);
  });

  it('reports the other provider that an orphan shim shadows', () => {
    using tree = createTempTree({ 'shims/foo': renderShim('foo', ['nodejs 22.14.0']), 'path/foo': '' });
    fs.chmodSync(tree.resolve('path/foo'), 0o755);
    linkBin(tree, '22.14.0', 'foo', '../lib/node_modules/foo-cli/cli.js');

    const [shim] = listStrandedAsdfShims(buildOptions(tree, [tree.resolve('path')]));

    expect(shim?.otherProvider).toBe(tree.resolve('path/foo'));
    expect(shim?.backingPackage).toBe('foo-cli');
  });

  it('does not count the shims directory itself as another provider, however PATH spells it', () => {
    using tree = createTempTree({ 'shims/pn': renderShim('pn', ['nodejs 24.18.1']) });
    fs.chmodSync(tree.resolve('shims/pn'), 0o755);
    fs.symlinkSync(tree.resolve('shims'), tree.resolve('shims-alias'));

    const [shim] = listStrandedAsdfShims(buildOptions(tree, [tree.resolve('shims-alias')]));

    expect(shim?.otherProvider).toBeUndefined();
  });

  it('passes over a shim that the active version provides, and one of another plugin', () => {
    using tree = createTempTree({
      'shims/pnpm': renderShim('pnpm', ['nodejs 24.20.0', 'nodejs 24.18.1']),
      'shims/python': renderShim('python', ['python 3.13.1']),
    });

    expect(listStrandedAsdfShims(buildOptions(tree))).toStrictEqual([]);
  });

  it('passes over a shim that an installed version of another plugin also provides', () => {
    using tree = createTempTree({
      'shims/yarn': renderShim('yarn', ['yarn 1.22.22', 'nodejs 24.18.1']),
      'installs/yarn/1.22.22/bin/yarn': '',
    });

    expect(listStrandedAsdfShims(buildOptions(tree))).toStrictEqual([]);
  });

  it('reports a shim whose other plugin is named by a stale line, with no install behind it', () => {
    using tree = createTempTree({ 'shims/yarn': renderShim('yarn', ['yarn 1.22.22', 'nodejs 24.18.1']) });

    expect(listStrandedAsdfShims(buildOptions(tree)).map((shim) => shim.name)).toStrictEqual(['yarn']);
  });

  it('names a scoped backing package, and leaves one that does not resolve undefined', () => {
    using tree = createTempTree({
      'shims/plain': renderShim('plain', ['nodejs 24.18.1']),
      'shims/scoped': renderShim('scoped', ['nodejs 24.18.1']),
      [`installs/nodejs/${OLD}/bin/plain`]: '#!/bin/sh\n',
    });
    linkBin(tree, OLD, 'scoped', '../lib/node_modules/@scope/tool/cli.js');

    const shims = listStrandedAsdfShims(buildOptions(tree));

    expect(shims.map((shim) => [shim.name, shim.backingPackage])).toStrictEqual([
      ['plain', undefined],
      ['scoped', '@scope/tool'],
    ]);
  });

  it('takes the backing package from the first providing version whose bin resolves', () => {
    using tree = createTempTree({ 'shims/tool': renderShim('tool', ['nodejs 24.19.0', 'nodejs 24.18.1']) });
    linkBin(tree, OLD, 'tool', '../lib/node_modules/tool-cli/cli.js');

    expect(listStrandedAsdfShims(buildOptions(tree))[0]?.backingPackage).toBe('tool-cli');
  });

  it('lists every providing version and sorts the result by name', () => {
    using tree = createTempTree({
      'shims/b': renderShim('b', ['nodejs 24.18.1']),
      'shims/a': renderShim('a', ['nodejs 24.19.0', 'nodejs 24.18.1']),
    });

    expect(listStrandedAsdfShims(buildOptions(tree)).map((shim) => [shim.name, shim.providingVersions])).toStrictEqual([
      ['a', ['24.19.0', OLD]],
      ['b', [OLD]],
    ]);
  });

  it('yields nothing where the shims directory is absent', () => {
    using tree = createTempTree({});

    expect(listStrandedAsdfShims(buildOptions(tree))).toStrictEqual([]);
  });
});

// region | Helpers

/** Builds options judging the tree's shims against the active nodejs version. */
function buildOptions(tree: TempTree, pathDirs: string[] = []) {
  return { dataDir: tree.dir, pathDirs: [tree.resolve('shims'), ...pathDirs], plugin: 'nodejs', version: ACTIVE };
}

/** Writes the bin symlink that npm leaves under an install, pointing at a target relative to `bin/`. */
function linkBin(tree: TempTree, version: string, name: string, target: string): void {
  fs.mkdirSync(tree.resolve(`installs/nodejs/${version}/bin`), { recursive: true });
  fs.symlinkSync(target, tree.resolve(`installs/nodejs/${version}/bin/${name}`));
}

/** Renders a shim as asdf writes it, one `# asdf-plugin:` line per `<plugin> <version>` entry. */
function renderShim(name: string, providers: string[]): string {
  const header = providers.map((provider) => `# asdf-plugin: ${provider}`).join('\n');

  return `#!/usr/bin/env bash\n${header}\nexec asdf exec "${name}" "$@"`;
}

// endregion | Helpers
