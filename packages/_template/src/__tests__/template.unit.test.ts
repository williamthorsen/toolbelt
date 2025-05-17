/* eslint vitest/no-conditional-tests: off */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };

const thisFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(thisFilePath);
const [workspaceDirectoryName] = currentDirectory.split('/').slice(-3, -2);

if (workspaceDirectoryName === '_template') {
  describe('workspace is _template', () => {
    it.todo('remove after renamed workspace passes test');
  });
} else {
  describe('workspace is clone', () => {
    it('package name has been changed from the default', () => {
      expect(packageJson.name).not.toBe('workspace-template');
    });

    it('homepage has been changed from the default', () => {
      expect(packageJson.homepage).not.toContain('template#readme');
    });

    it('workspace placeholder has been replaced in CHANGELOG', () => {
      const readmePath = path.resolve(currentDirectory, '../../CHANGELOG.md');
      const readmeContents = readFileSync(readmePath, { encoding: 'utf8' });

      expect(readmeContents).not.toContain('Workspace template changelog');
    });

    it('workspace placeholder has been replaced in README', () => {
      const readmePath = path.resolve(currentDirectory, '../../README.md');
      const readmeContents = readFileSync(readmePath, { encoding: 'utf8' });

      expect(readmeContents).not.toContain('Workspace template');
    });
  });
}
