import assert from 'node:assert';
import fs from 'node:fs';

import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import rawPackageJson from '../package.json' with { type: 'json' };
import { isObject } from '../packages/objects/src/4-release/is-object.ts';
import { ASDF_VERSION_FILE, GITHUB_ACTION_FILE, GITHUB_ACTION_FILE_PATH } from './config.ts';
import { getRuntimeVersionFromAsdf } from './helpers/getRuntimeVersionFromAsdf.ts';
import { getValueAtPathOrThrow } from './helpers/getValueAtPathOrThrow.ts';

describe('pnpm version consistency', () => {
  it('pnpm version is the same in GitHub action and .tool-versions', async () => {
    const actionVersion = await getPnpmVersionFromAction();
    const asdfVersion = await getRuntimeVersionFromAsdf('pnpm');

    expect(actionVersion).toBe(asdfVersion);
  });

  it('pnpm version is the same in .tool-versions and package.json', async () => {
    const asdfVersion = await getPnpmVersionFromAsdf();
    const packageJsonVersion = getPnpmVersionFromPackageJson();

    expect(asdfVersion).toBe(packageJsonVersion);
  });

  it('pnpm version is the same in GitHub action and package.json', async () => {
    const actionVersion = await getPnpmVersionFromAction();
    const packageJsonVersion = getPnpmVersionFromPackageJson();

    expect(actionVersion).toBe(packageJsonVersion);
  });
});

async function getPnpmVersionFromAction(): Promise<string> {
  const actionYaml = await fs.promises.readFile(GITHUB_ACTION_FILE_PATH, { encoding: 'utf8' });
  const action = yaml.load(actionYaml);
  assert.ok(action, `Action not found in ${GITHUB_ACTION_FILE}`);

  const steps = getValueAtPathOrThrow(action, 'jobs.code-quality.steps');
  assert.ok(Array.isArray(steps), 'jobs.code-quality.steps is not an array');

  const pnpmStep = steps.find(
    (step: unknown) => isObject(step) && typeof step.uses === 'string' && step.uses.startsWith('pnpm/action-setup@'),
  );
  assert.ok(pnpmStep, '"pnpm/action-setup" step not found in action');

  const version = getValueAtPathOrThrow(pnpmStep, 'with.version');
  assert.ok(typeof version === 'string' && version.length > 0, 'pnpm version not found in action');

  return version;
}

async function getPnpmVersionFromAsdf(): Promise<string> {
  const toolVersions = await fs.promises.readFile(ASDF_VERSION_FILE, { encoding: 'utf8' });

  const pnpmLine = toolVersions.split('\n').find((line) => line.startsWith('pnpm')) ?? '';
  const [, pnpmVersion] = pnpmLine.split(' ');
  assert.ok(pnpmLine && pnpmVersion, 'pnpm version not found in .tool-versions.');

  return pnpmVersion;
}

/**
 * Extracts the pnpm version from the packageManager field in package.json.
 *
 * @returns The pnpm version string.
 * @throws If the packageManager field is missing, malformed, or not for pnpm.
 */
function getPnpmVersionFromPackageJson(): string {
  const pm = getValueAtPathOrThrow(rawPackageJson, 'packageManager');

  if (typeof pm !== 'string') {
    throw new TypeError('"packageManager" field missing or not a string in package.json.');
  }

  const [name, version] = pm.split('@');
  if (name !== 'pnpm') {
    throw new Error('packageManager is not pnpm.');
  }
  if (!version) {
    throw new Error('pnpm version missing in package.json.');
  }

  return version;
}
