import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

import { listManifestSearchSites } from '../listManifestSearchSites.ts';

// The owning-package walk from `codeassembly`, which probes in the loop head.
const PROBE_IN_HEAD = dedent`
  export function resolveRunningPackageRoot(): string {
    let currentDir = path.dirname(fileURLToPath(import.meta.url));

    while (!existsSync(path.join(currentDir, 'package.json'))) {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        throw new Error(\`Could not locate the running package: no package.json above \${import.meta.url}\`);
      }
      currentDir = parentDir;
    }

    return currentDir;
  }

`;

// The owning-package walk from `nmr-core`, which builds the probed path with `resolve`.
const PROBE_BY_RESOLVE = dedent`
  export function findPackageRoot(fromUrl: string): string {
    let dir = dirname(fileURLToPath(fromUrl));
    while (!existsSync(resolve(dir, 'package.json'))) {
      const parent = dirname(dir);
      if (parent === dir) {
        throw new Error('Could not find package root from ' + fromUrl);
      }
      dir = parent;
    }
    return dir;
  }

`;

// A project-root walk that accepts a manifest when no repository marker is found first.
const PROBE_BESIDE_MARKER = dedent`
  export function findRoot(startDir) {
    let dir = startDir;
    while (true) {
      if (fs.existsSync(path.join(dir, '.git'))) return dir;
      if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) return startDir;
      dir = parent;
    }
  }

`;

// The compile-root walk from `readyup`, which probes through a module constant.
const PROBE_BY_CONSTANT = dedent`
  const PACKAGE_MANIFEST = 'package.json';

  export function resolveCompileRoot(inputPath: string): string {
    const sourceDir = path.dirname(path.resolve(inputPath));

    for (let directory = sourceDir; ; directory = path.dirname(directory)) {
      if (existsSync(path.join(directory, PACKAGE_MANIFEST))) return toRealPath(directory);
      if (path.dirname(directory) === directory) return toRealPath(sourceDir);
    }
  }

`;

// The owning-package walk from `readyup`, which probes through a binding declared in the loop.
const PROBE_BY_BINDING = dedent`
  function identifyPackage(directory: string): { name: string; version: string } | undefined {
    for (let current = directory; isDependencyFile(current); current = path.dirname(current)) {
      const manifestPath = path.join(current, 'package.json');
      if (!existsSync(manifestPath)) continue;
      const identity = readPackageIdentity(manifestPath);
      if (identity !== undefined) return identity;
    }
    return undefined;
  }

`;

// A repository-root walk, which `toolbelt.filesystem` claims.
const MARKER_ONLY = dedent`
  export function findRepositoryRoot(startDir) {
    let dir = startDir;
    while (true) {
      if (fs.existsSync(path.join(dir, '.git'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }

`;

// A dependency's manifest looked up through the `node_modules` of each level, as `codeassembly` reads
// release-kit's version, with the probe written inline.
const DEPENDENCY_MANIFEST = dedent`
  export function readReleaseKitVersion() {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (;;) {
      if (existsSync(path.join(dir, 'node_modules', '@williamthorsen', 'release-kit', 'package.json'))) {
        return JSON.parse(readFileSync(path.join(dir, 'node_modules', '@williamthorsen', 'release-kit', 'package.json'), 'utf8')).version;
      }
      const parent = path.dirname(dir);
      if (parent === dir) throw new Error('release-kit is not installed');
      dir = parent;
    }
  }

`;

// The same lookup for a dependency named by a binding.
const NAMED_DEPENDENCY_MANIFEST = dedent`
  export function findDependencyRoot(name) {
    let dir = process.cwd();
    while (true) {
      if (existsSync(path.join(dir, 'node_modules', name, 'package.json'))) return path.join(dir, 'node_modules', name);
      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }

`;

// The installed-package lookup from `readyup`, whose binding holds a dependency named by another binding.
const NAMED_DEPENDENCY_BY_BINDING = dedent`
  export function resolvePackageRoot(packageName: string, fromDir: string = process.cwd()): string | undefined {
    let dir = path.resolve(fromDir);

    for (;;) {
      const candidate = path.join(dir, 'node_modules', packageName);
      if (existsSync(path.join(candidate, 'package.json'))) {
        return realpathSync(candidate);
      }

      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }

`;

// The release-kit lookup from `codeassembly` as written there, through a binding. The scan does not read
// `pathExists` as a probe, so the loop is read through its `readFile` of the same binding.
const DEPENDENCY_MANIFEST_BY_BINDING = dedent`
  export async function readReleaseKitVersion(): Promise<string> {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (;;) {
      const candidate = path.join(dir, 'node_modules', '@williamthorsen', 'release-kit', 'package.json');
      if (await pathExists(candidate, { treatErrorsAsAbsent: true })) {
        const parsed: unknown = JSON.parse(await readFile(candidate, 'utf8'));
        if (isReleaseKitPackageJson(parsed)) return parsed.version;
      }
      const parent = path.dirname(dir);
      if (parent === dir) throw new Error('release-kit is not installed');
      dir = parent;
    }
  }

`;

// A read of the manifest at a root already found, as `codeassembly` reads its running package's version.
const LONE_MANIFEST_READ = dedent`
  export function readRunningPackageVersion(): string {
    const manifestPath = path.join(resolveRunningPackageRoot(), 'package.json');
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!isRecord(parsed) || typeof parsed.version !== 'string') {
      throw new Error(\`Could not read a version from \${manifestPath}\`);
    }
    return parsed.version;
  }

`;

// A search of the chain listed by `listDirectoryChain`, as this package's own `resolveOwningManifest` makes it.
const CHAIN_LOOP = dedent`
  export function resolveOwningManifest(fromUrl: string): OwningManifest {
    const startDir = path.dirname(fileURLToPath(fromUrl));

    for (const dir of listDirectoryChain(startDir)) {
      const manifestPath = path.join(dir, 'package.json');

      if (!fs.existsSync(manifestPath)) continue;

      const manifest = readManifest(manifestPath);

      if (typeof manifest.name === 'string') {
        return { manifest, manifestPath, packageDir: dir };
      }
    }

    throw new Error(\`No package.json declaring a name was found at or above: \${fromUrl}\`);
  }

`;

describe(listManifestSearchSites, () => {
  it('reports an owning-package walk at the line on which its loop opens', () => {
    expect([PROBE_IN_HEAD, PROBE_BY_RESOLVE].map((source) => listManifestSearchSites(source))).toStrictEqual([
      [{ kind: 'manifest-search', line: 4 }],
      [{ kind: 'manifest-search', line: 3 }],
    ]);
  });

  it('reports a walk probing for a manifest through a constant or a binding declared in its loop', () => {
    expect([PROBE_BY_CONSTANT, PROBE_BY_BINDING].map((source) => listManifestSearchSites(source))).toStrictEqual([
      [{ kind: 'manifest-search', line: 6 }],
      [{ kind: 'manifest-search', line: 2 }],
    ]);
  });

  it('reports a walk probing for a manifest beside a repository marker', () => {
    expect(listManifestSearchSites(PROBE_BESIDE_MARKER)).toStrictEqual([{ kind: 'manifest-search', line: 3 }]);
  });

  it('reports nothing for a walk probing for a repository marker alone', () => {
    expect(listManifestSearchSites(MARKER_ONLY)).toStrictEqual([]);
  });

  it('reports nothing for a walk probing for a manifest below the level, written in place or through a binding', () => {
    const sources = [
      DEPENDENCY_MANIFEST,
      NAMED_DEPENDENCY_MANIFEST,
      DEPENDENCY_MANIFEST_BY_BINDING,
      NAMED_DEPENDENCY_BY_BINDING,
    ];

    expect(sources.map((source) => listManifestSearchSites(source))).toStrictEqual([[], [], [], []]);
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
