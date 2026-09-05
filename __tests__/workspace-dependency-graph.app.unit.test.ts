import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { isRecord } from '../test-utils/isRecord.ts';
import { readManifest } from '../test-utils/readManifest.ts';

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

describe('The workspace dependency graph', () => {
  it('holds no cycle among the workspaces', () => {
    const { cycles, workspaceCount } = auditWorkspaceGraph(findMonorepoRoot());

    expect(cycles).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no cycle either.
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Reports every dependency cycle among the workspaces, each as the path that closes it.
 *
 * pnpm cannot order a cycle's members topologically, so a recursive build takes them in an arbitrary order
 * while each still needs the others' output. It says so once at install, where the warning is easy to miss.
 *
 * Workspaces are discovered rather than listed, so a package added later is covered on arrival. The root
 * manifest stays out: nothing depends on it, so it cannot sit in a cycle.
 */
function auditWorkspaceGraph(monorepoRoot: string): { cycles: string[]; workspaceCount: number } {
  const manifests = getWorkspacePackageDirs(monorepoRoot).map((directory) => readGraphNode(directory));
  const workspaceNames = new Set(manifests.map((manifest) => manifest.name));
  const graph = new Map(
    manifests.map((manifest) => [
      manifest.name,
      manifest.dependencies.filter((dependency) => workspaceNames.has(dependency)),
    ]),
  );

  return { cycles: listCycles(graph), workspaceCount: manifests.length };
}

/** Reports each cycle closed by a depth-first walk of the graph, as `a -> b -> a`. */
function listCycles(graph: Map<string, string[]>): string[] {
  const cycles: string[] = [];
  const states = new Map<string, 'visited' | 'visiting'>();
  const walked: string[] = [];

  function visit(name: string): void {
    const state = states.get(name);
    if (state === 'visited') return;
    if (state === 'visiting') {
      cycles.push([...walked.slice(walked.indexOf(name)), name].join(' -> '));
      return;
    }

    states.set(name, 'visiting');
    walked.push(name);

    const dependencies = graph.get(name) ?? [];
    for (const dependency of dependencies) visit(dependency);

    walked.pop();
    states.set(name, 'visited');
  }

  const names = graph
    .keys()
    .toArray()
    .toSorted((a, b) => a.localeCompare(b));
  for (const name of names) visit(name);

  return cycles.toSorted((a, b) => a.localeCompare(b));
}

/**
 * Reads a workspace's name and the names on which it depends, across every field that links one workspace to
 * another.
 */
function readGraphNode(packageDirectory: string): { dependencies: string[]; name: string } {
  const parsed = readManifest(packageDirectory);

  if (typeof parsed['name'] !== 'string') {
    throw new TypeError(`Manifest in "${packageDirectory}" declares no name`);
  }

  const dependencies = DEPENDENCY_FIELDS.flatMap((field) => {
    const block = parsed[field];
    return isRecord(block) ? Object.keys(block) : [];
  });

  return { dependencies, name: parsed['name'] };
}

// endregion | Helpers
