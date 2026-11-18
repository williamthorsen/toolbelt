import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import releaseKitConfig from '../.config/release-kit.config.ts';
import { isRecord } from '../test-utils/isRecord.ts';
import { listPublishedWorkspaceDirectories } from '../test-utils/private-workspaces.ts';

// The bullet in AGENTS.md whose parenthesized list names every published domain.
const DOMAIN_BULLET_PREFIX = '- `packages/{domain}/`:';
// A row of the root README's package map: the package's README link, then its description. Prettier pads the cells.
const PACKAGE_MAP_ROW_PATTERN = /^\|\s*\[[^\]]*\]\(packages\/([^/)]+)\/README\.md\)\s*\|\s*(.*?)\s*\|$/gm;
// Matched by line rather than parsed: The root installs no YAML parser, and `release-kit sync-labels generate`
// emits this file with a fixed shape.
const LABEL_NAME_PATTERN = /^- name: (\S+)$/gm;

describe('Package registration', () => {
  it('every published workspace is recorded in each file that names the packages', () => {
    const { unregistered, workspaceCount } = auditPackageRegistration(findMonorepoRoot());

    expect(unregistered).toStrictEqual([]);
    // Guard against a vacuous pass: A broken walk would report nothing unregistered either.
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every published workspace against the five files that record a package: the release-kit label
 * configuration, the labels file generated from it, the label lookup that maps a commit scope to a label, the domain
 * list in AGENTS.md, and the package map in the root README, whose description must match the manifest's. A
 * scaffolding pull request that misses one of them is merged in silence.
 *
 * The check runs in one direction alone, so an entry naming no published workspace stays legal: Both
 * `.meta/label-map.json` and the label configuration hold lookups for private workspaces and for `root`.
 */
function auditPackageRegistration(monorepoRoot: string): { unregistered: string[]; workspaceCount: number } {
  const configuredLabels = new Set(Object.keys(releaseKitConfig.repoLabels?.labels ?? {}));
  const documentedDomains = readDocumentedDomains(monorepoRoot);
  const generatedLabels = readGeneratedLabels(monorepoRoot);
  const mappedScopes = readMappedScopes(monorepoRoot);
  const packageMap = readPackageMap(monorepoRoot);

  const unregistered: string[] = [];
  let workspaceCount = 0;

  for (const packageDirectory of listPublishedWorkspaceDirectories(monorepoRoot)) {
    workspaceCount += 1;

    const workspace = path.basename(packageDirectory);
    const label = `scope:${workspace}`;

    if (!configuredLabels.has(label)) {
      unregistered.push(`${workspace}: .config/release-kit.config.ts declares no ${label} under repoLabels.labels`);
    }

    if (!generatedLabels.has(label)) {
      unregistered.push(`${workspace}: .github/labels.yaml holds no ${label}; regenerate it with release-kit`);
    }

    if (mappedScopes[workspace] !== label) {
      unregistered.push(`${workspace}: .meta/label-map.json maps no scope ${workspace} to ${label}`);
    }

    if (!documentedDomains.has(workspace)) {
      unregistered.push(`${workspace}: AGENTS.md's domain list omits it`);
    }

    const mapDescription = packageMap.get(workspace);
    const manifestDescription = readManifestDescription(packageDirectory);
    if (mapDescription === undefined) {
      unregistered.push(`${workspace}: README.md's package map omits it`);
    } else if (mapDescription !== manifestDescription) {
      unregistered.push(
        `${workspace}: README.md's package map describes it as "${mapDescription}", and package.json as "${manifestDescription}"`,
      );
    }
  }

  return { unregistered: unregistered.toSorted((a, b) => a.localeCompare(b)), workspaceCount };
}

/**
 * Reads the domains named by the parenthesized list on AGENTS.md's `packages/{domain}/` bullet. Throws on a
 * reformatted bullet rather than reporting every workspace as undocumented, so the failure names its own cause.
 */
function readDocumentedDomains(monorepoRoot: string): Set<string> {
  const contents = fs.readFileSync(path.join(monorepoRoot, 'AGENTS.md'), 'utf8');
  const bullet = contents.split('\n').find((line) => line.startsWith(DOMAIN_BULLET_PREFIX));

  if (bullet === undefined) {
    throw new Error(`AGENTS.md holds no line beginning "${DOMAIN_BULLET_PREFIX}"`);
  }

  const domains = /\(([^)]*)\)/.exec(bullet)?.[1];
  if (domains === undefined) {
    throw new Error(`AGENTS.md's domain bullet holds no parenthesized list: ${bullet}`);
  }

  return new Set(domains.split(',').map((domain) => domain.trim()));
}

/** Reads the label names declared by the generated labels file. */
function readGeneratedLabels(monorepoRoot: string): Set<string> {
  const contents = fs.readFileSync(path.join(monorepoRoot, '.github', 'labels.yaml'), 'utf8');
  const labels = new Set<string>();

  for (const [, label] of contents.matchAll(LABEL_NAME_PATTERN)) {
    if (label !== undefined) labels.add(label);
  }

  // The `common` preset alone declares labels, so an empty result is the pattern failing rather than a file holding
  // none. Report that as its own cause instead of as every workspace missing a label.
  if (labels.size === 0) {
    throw new Error(`.github/labels.yaml holds no line matching ${LABEL_NAME_PATTERN.source}`);
  }

  return labels;
}

/** Reads a workspace manifest's `description`, or an empty string when it declares none. */
function readManifestDescription(packageDirectory: string): string {
  const parsed: unknown = JSON.parse(fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'));
  const description = isRecord(parsed) ? parsed['description'] : undefined;

  return typeof description === 'string' ? description : '';
}

/** Reads the scope-to-label lookup that release-kit resolves a commit's scope through. */
function readMappedScopes(monorepoRoot: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(fs.readFileSync(path.join(monorepoRoot, '.meta', 'label-map.json'), 'utf8'));
  const scopes = isRecord(parsed) ? parsed['scopes'] : undefined;

  if (!isRecord(scopes)) {
    throw new Error('.meta/label-map.json holds no `scopes` object');
  }

  return scopes;
}

/** Reads the root README's package map as a lookup from domain to description. */
function readPackageMap(monorepoRoot: string): Map<string, string> {
  const contents = fs.readFileSync(path.join(monorepoRoot, 'README.md'), 'utf8');
  const packageMap = new Map<string, string>();

  for (const [, domain, description] of contents.matchAll(PACKAGE_MAP_ROW_PATTERN)) {
    if (domain !== undefined && description !== undefined) packageMap.set(domain, description);
  }

  // Report a reformatted map as its own cause instead of as every workspace missing from it.
  if (packageMap.size === 0) {
    throw new Error(`README.md holds no line matching ${PACKAGE_MAP_ROW_PATTERN.source}`);
  }

  return packageMap;
}

// endregion | Helpers
