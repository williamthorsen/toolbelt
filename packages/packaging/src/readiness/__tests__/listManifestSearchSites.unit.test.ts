import { describe, expect, it } from 'vitest';

import { listManifestSearchSites } from '../listManifestSearchSites.ts';

// The owning-package walk from `codeassembly`, which probes in the loop head.
const PROBE_IN_HEAD = [
  'export function resolveRunningPackageRoot(): string {',
  '  let currentDir = path.dirname(fileURLToPath(import.meta.url));',
  '',
  "  while (!existsSync(path.join(currentDir, 'package.json'))) {",
  '    const parentDir = path.dirname(currentDir);',
  '    if (parentDir === currentDir) {',
  '      throw new Error(`Could not locate the running package: no package.json above ${import.meta.url}`);',
  '    }',
  '    currentDir = parentDir;',
  '  }',
  '',
  '  return currentDir;',
  '}',
  '',
].join('\n');

// The owning-package walk from `nmr-core`, which builds the probed path with `resolve`.
const PROBE_BY_RESOLVE = [
  'export function findPackageRoot(fromUrl: string): string {',
  '  let dir = dirname(fileURLToPath(fromUrl));',
  "  while (!existsSync(resolve(dir, 'package.json'))) {",
  '    const parent = dirname(dir);',
  '    if (parent === dir) {',
  "      throw new Error('Could not find package root from ' + fromUrl);",
  '    }',
  '    dir = parent;',
  '  }',
  '  return dir;',
  '}',
  '',
].join('\n');

// A project-root walk that accepts a manifest where no repository marker is found first.
const PROBE_BESIDE_MARKER = [
  'export function findRoot(startDir) {',
  '  let dir = startDir;',
  '  while (true) {',
  "    if (fs.existsSync(path.join(dir, '.git'))) return dir;",
  "    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;",
  '    const parent = path.dirname(dir);',
  '    if (parent === dir) return startDir;',
  '    dir = parent;',
  '  }',
  '}',
  '',
].join('\n');

// A repository-root walk, which `toolbelt.filesystem` claims.
const MARKER_ONLY = [
  'export function findRepositoryRoot(startDir) {',
  '  let dir = startDir;',
  '  while (true) {',
  "    if (fs.existsSync(path.join(dir, '.git'))) return dir;",
  '    const parent = path.dirname(dir);',
  '    if (parent === dir) return undefined;',
  '    dir = parent;',
  '  }',
  '}',
  '',
].join('\n');

// A dependency's manifest looked up through the `node_modules` of each level, as `codeassembly` reads
// release-kit's version, with the probe written inline.
const DEPENDENCY_MANIFEST = [
  'export function readReleaseKitVersion() {',
  '  let dir = path.dirname(fileURLToPath(import.meta.url));',
  '  for (;;) {',
  "    if (existsSync(path.join(dir, 'node_modules', '@williamthorsen', 'release-kit', 'package.json'))) {",
  "      return JSON.parse(readFileSync(path.join(dir, 'node_modules', '@williamthorsen', 'release-kit', 'package.json'), 'utf8')).version;",
  '    }',
  '    const parent = path.dirname(dir);',
  "    if (parent === dir) throw new Error('release-kit is not installed');",
  '    dir = parent;',
  '  }',
  '}',
  '',
].join('\n');

// The same lookup for a dependency named by a binding.
const NAMED_DEPENDENCY_MANIFEST = [
  'export function findDependencyRoot(name) {',
  '  let dir = process.cwd();',
  '  while (true) {',
  "    if (existsSync(path.join(dir, 'node_modules', name, 'package.json'))) return path.join(dir, 'node_modules', name);",
  '    const parent = path.dirname(dir);',
  '    if (parent === dir) return undefined;',
  '    dir = parent;',
  '  }',
  '}',
  '',
].join('\n');

// A read of the manifest at a root already found, as `codeassembly` reads its running package's version.
const LONE_MANIFEST_READ = [
  'export function readRunningPackageVersion(): string {',
  "  const manifestPath = path.join(resolveRunningPackageRoot(), 'package.json');",
  "  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));",
  "  if (!isRecord(parsed) || typeof parsed.version !== 'string') {",
  '    throw new Error(`Could not read a version from ${manifestPath}`);',
  '  }',
  '  return parsed.version;',
  '}',
  '',
].join('\n');

// A search of the chain listed by `listDirectoryChain`, as this package's own `resolveOwningManifest` makes it.
const CHAIN_LOOP = [
  'export function resolveOwningManifest(fromUrl: string): OwningManifest {',
  '  const startDir = path.dirname(fileURLToPath(fromUrl));',
  '',
  '  for (const dir of listDirectoryChain(startDir)) {',
  "    const manifestPath = path.join(dir, 'package.json');",
  '',
  '    if (!fs.existsSync(manifestPath)) continue;',
  '',
  '    const manifest = readManifest(manifestPath);',
  '',
  "    if (typeof manifest.name === 'string') {",
  '      return { manifest, manifestPath, packageDir: dir };',
  '    }',
  '  }',
  '',
  '  throw new Error(`No package.json declaring a name was found at or above: ${fromUrl}`);',
  '}',
  '',
].join('\n');

describe(listManifestSearchSites, () => {
  it('reports an owning-package walk at the line on which its loop opens', () => {
    expect([PROBE_IN_HEAD, PROBE_BY_RESOLVE].map((source) => listManifestSearchSites(source))).toStrictEqual([
      [{ kind: 'manifest-search', line: 4 }],
      [{ kind: 'manifest-search', line: 3 }],
    ]);
  });

  it('reports a walk probing for a manifest beside a repository marker', () => {
    expect(listManifestSearchSites(PROBE_BESIDE_MARKER)).toStrictEqual([{ kind: 'manifest-search', line: 3 }]);
  });

  it('reports nothing for a walk probing for a repository marker alone', () => {
    expect(listManifestSearchSites(MARKER_ONLY)).toStrictEqual([]);
  });

  it('reports nothing for a walk probing for a manifest below the level', () => {
    const sources = [DEPENDENCY_MANIFEST, NAMED_DEPENDENCY_MANIFEST];

    expect(sources.map((source) => listManifestSearchSites(source))).toStrictEqual([[], []]);
  });

  it('reports nothing for a read of a manifest outside any loop', () => {
    expect(listManifestSearchSites(LONE_MANIFEST_READ)).toStrictEqual([]);
  });

  it('reports nothing for a loop over a chain that another function lists', () => {
    expect(listManifestSearchSites(CHAIN_LOOP)).toStrictEqual([]);
  });

  it('finds nothing in prose about a manifest search', () => {
    const sources = [
      "// while (!existsSync(path.join(dir, 'package.json'))) { dir = path.dirname(dir); }\n",
      'const fix = "while (!existsSync(path.join(dir, \'package.json\'))) { dir = path.dirname(dir); }";\n',
    ];

    expect(sources.map((source) => listManifestSearchSites(source))).toStrictEqual([[], []]);
  });
});
