import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

const GITHUB_ACTION_FILE = 'code-quality.yaml';
const GITHUB_ACTION_FILE_PATH = path.join('.github/workflows', GITHUB_ACTION_FILE);
const ASDF_VERSION_FILE = '.tool-versions';

describe('.github code-quality action', () => {
  it('Node.js version is the same in ASDF version file and GitHub action', async () => {
    const toolVersion = await getNodeVersionFromAsdf();
    const actionVersion = await getNodeVersionFromAction();

    expect(toolVersion).toBe(actionVersion);
  });
});

async function getNodeVersionFromAction() {
  const actionYaml = await fs.promises.readFile(GITHUB_ACTION_FILE_PATH, { encoding: 'utf8' });
  const action = yaml.load(actionYaml);
  assert.ok(action, `Action not found in ${GITHUB_ACTION_FILE}`);

  const steps = getValueAtPathOrThrow(action, 'jobs.code-quality.steps');
  assert.ok(Array.isArray(steps), 'jobs.code-quality.steps is not an array');

  const nodeStep = steps.find((step: unknown) => isObject(step) && step.name === 'Set up Node.js');
  assert.ok(nodeStep, '"Set up Node.js" step not found in action');

  return getValueAtPathOrThrow(nodeStep, 'with.node-version');
}

async function getNodeVersionFromAsdf() {
  const toolVersions = await fs.promises.readFile(ASDF_VERSION_FILE, { encoding: 'utf8' });

  const nodeVersionLine = toolVersions.split('\n').find((line) => line.startsWith('nodejs')) ?? '';
  const [, nodeVersion] = nodeVersionLine.split(' ');
  assert.ok(nodeVersionLine && nodeVersion, 'Node.js version not found in .tool-versions.');

  return nodeVersion;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getValueAtPathOrThrow(obj: unknown, path: unknown): unknown {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string');
  }

  const normalizedPath = path.replaceAll(/\[(\w+)]/g, '.$1');
  const keys: string[] = normalizedPath.split('.');

  let current: unknown = obj;

  for (const key of keys) {
    if (Array.isArray(current) && /^\d+$/.test(key)) {
      const index = Number(key);
      if (index in current) {
        current = current[index];
        continue;
      }
      throw new Error(`Missing array index: ${key} in "${path}"`);
    }

    if (isObject(current) && key in current) {
      const objectValue: Record<string, unknown> = current;
      current = objectValue[key];
    } else {
      throw new Error(`Missing path segment: ${key} in "${path}"`);
    }
  }

  return current;
}
