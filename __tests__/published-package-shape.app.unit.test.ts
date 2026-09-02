import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { isRecord } from '../test-utils/isRecord.ts';
import { listPublishedWorkspaceDirectories, PRIVATE_WORKSPACES } from '../test-utils/private-workspaces.ts';
import { readManifest } from '../test-utils/readManifest.ts';

const HOMEPAGE_PREFIX = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/';
const NPM_REGISTRY = 'https://registry.npmjs.org';
const PUBLISHED_NAME_PREFIX = '@williamthorsen/toolbelt.';
// release-kit injects each release's notes between these markers, so a README carrying neither loses them silently.
const RELEASE_NOTES_MARKER = '<!-- section:release-notes -->';
// The template's changelog holds its own release history, which belongs to the template rather than to a clone.
const TEMPLATE_CHANGELOG_ENTRY = '_template-v';
// npm shows a package's description on its registry page, so a clone that kept the template's would publish it.
const TEMPLATE_DESCRIPTION = 'Template for new workspace';

describe('Published package shape', () => {
  it('every published workspace carries the manifest that a scaffolded clone must reach', () => {
    const { defects, workspaceCount } = auditPublishedManifests(findMonorepoRoot());

    expect(defects).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no defects either.
    expect(workspaceCount).toBeGreaterThan(0);
  });

  it('every published workspace carries a README and a changelog of its own', () => {
    const { defects, workspaceCount } = auditPublishedDocuments(findMonorepoRoot());

    expect(defects).toStrictEqual([]);
    expect(workspaceCount).toBeGreaterThan(0);
  });

  it('the declared private set names every workspace that publishes nothing', () => {
    const { mismatches, workspaceCount } = auditPrivateSet(findMonorepoRoot());

    expect(mismatches).toStrictEqual([]);
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every published workspace's manifest against the shape that a clone of `packages/_template` reaches.
 * The template is private, so the fields read here are the ones that it cannot carry: the scoped name and
 * homepage, the npm publish configuration, and a `prepublishOnly` build in place of the template's `build` no-op.
 */
function auditPublishedManifests(monorepoRoot: string): { defects: string[]; workspaceCount: number } {
  const defects: string[] = [];
  let workspaceCount = 0;

  for (const packageDirectory of listPublishedWorkspaceDirectories(monorepoRoot)) {
    workspaceCount += 1;

    const workspace = path.basename(packageDirectory);
    const manifest = readManifest(packageDirectory);
    const description = manifest['description'];
    const publishConfig = manifest['publishConfig'];
    const repository = manifest['repository'];
    const scripts = manifest['scripts'];
    const prepublishOnly = isRecord(scripts) ? scripts['prepublishOnly'] : undefined;

    if (manifest['name'] !== `${PUBLISHED_NAME_PREFIX}${workspace}`) {
      defects.push(`${workspace}: name is not ${PUBLISHED_NAME_PREFIX}${workspace}`);
    }

    if (typeof description !== 'string' || description.trim() === '' || description === TEMPLATE_DESCRIPTION) {
      defects.push(`${workspace}: description is absent or still the template's`);
    }

    if (manifest['homepage'] !== `${HOMEPAGE_PREFIX}${workspace}#readme`) {
      defects.push(`${workspace}: homepage is not ${HOMEPAGE_PREFIX}${workspace}#readme`);
    }

    if (!isRecord(repository) || repository['directory'] !== `packages/${workspace}`) {
      defects.push(`${workspace}: repository.directory is not packages/${workspace}`);
    }

    if (
      !isRecord(publishConfig) ||
      publishConfig['access'] !== 'public' ||
      publishConfig['registry'] !== NPM_REGISTRY
    ) {
      defects.push(`${workspace}: publishConfig is not { access: 'public', registry: '${NPM_REGISTRY}' }`);
    }

    if (typeof prepublishOnly !== 'string' || !prepublishOnly.includes('nmr build')) {
      defects.push(`${workspace}: scripts.prepublishOnly does not run nmr build`);
    }

    if (isRecord(scripts) && Object.hasOwn(scripts, 'build')) {
      defects.push(`${workspace}: scripts declares build, which overrides the managed one with the template's no-op`);
    }
  }

  return { defects: defects.toSorted((a, b) => a.localeCompare(b)), workspaceCount };
}

/**
 * Audits every published workspace's README and changelog for the marks that separate an authored pair from a
 * pair copied out of the template: the package's own name as the README title, the release-notes markers that
 * release-kit writes between, and the absence of the template's own release history.
 *
 * The title check is what the marker check alone cannot do. The template's README quotes the markers in a code
 * fence, so a clone that copied it whole would carry the string without carrying a place to inject into.
 */
function auditPublishedDocuments(monorepoRoot: string): { defects: string[]; workspaceCount: number } {
  const defects: string[] = [];
  let workspaceCount = 0;

  for (const packageDirectory of listPublishedWorkspaceDirectories(monorepoRoot)) {
    workspaceCount += 1;

    const workspace = path.basename(packageDirectory);
    const readme = readDocument(packageDirectory, 'README.md');
    const changelog = readDocument(packageDirectory, 'CHANGELOG.md');

    if (readme === undefined) {
      defects.push(`${workspace}: README.md is missing`);
    } else {
      if (!readme.startsWith(`# ${PUBLISHED_NAME_PREFIX}${workspace}\n`)) {
        defects.push(`${workspace}: README.md does not open with the title # ${PUBLISHED_NAME_PREFIX}${workspace}`);
      }

      if (!readme.includes(RELEASE_NOTES_MARKER)) {
        defects.push(`${workspace}: README.md holds no ${RELEASE_NOTES_MARKER} marker for release-kit to inject into`);
      }
    }

    if (changelog === undefined) {
      defects.push(`${workspace}: CHANGELOG.md is missing`);
    } else if (changelog.includes(TEMPLATE_CHANGELOG_ENTRY)) {
      defects.push(`${workspace}: CHANGELOG.md carries the template's own release history`);
    }
  }

  return { defects: defects.toSorted((a, b) => a.localeCompare(b)), workspaceCount };
}

/**
 * Audits the declared private set against what the manifests say, in both directions. The set is what every
 * other audit here filters by, so a workspace privately publishing nothing while absent from the set would be
 * held to the published shape, and one named in the set while publishing would escape every check.
 */
function auditPrivateSet(monorepoRoot: string): { mismatches: string[]; workspaceCount: number } {
  const mismatches: string[] = [];
  let workspaceCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    workspaceCount += 1;

    const workspace = path.basename(packageDirectory);
    const isPrivate = readManifest(packageDirectory)['private'] === true;
    const isDeclared = PRIVATE_WORKSPACES.has(workspace);

    if (isPrivate && !isDeclared) {
      mismatches.push(`${workspace}: manifest declares private, and PRIVATE_WORKSPACES omits it`);
    }

    if (!isPrivate && isDeclared) {
      mismatches.push(`${workspace}: PRIVATE_WORKSPACES names it, and its manifest declares no private`);
    }
  }

  return { mismatches: mismatches.toSorted((a, b) => a.localeCompare(b)), workspaceCount };
}

/** Reads one of a package's documentation files, reporting an absent file as `undefined`. */
function readDocument(packageDirectory: string, fileName: string): string | undefined {
  const filePath = path.join(packageDirectory, fileName);

  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined;
}

// endregion | Helpers
