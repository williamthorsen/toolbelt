import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createTempTree } from '../../3-candidate/createTempTree.ts';
import { reconcileFile } from '../reconcileFile.ts';

describe(reconcileFile, () => {
  describe('created outcome', () => {
    it('writes a file that does not exist', () => {
      using tree = createTempTree({});
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'export {};\n');

      expect(result).toStrictEqual({ filePath, outcome: 'created' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('export {};\n');
    });

    it('creates missing parent directories', () => {
      using tree = createTempTree({});
      const filePath = tree.resolve('.github/workflows/audit.yaml');

      const result = reconcileFile(filePath, 'name: Audit\n');

      expect(result).toStrictEqual({ filePath, outcome: 'created' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('name: Audit\n');
    });
  });

  describe('overwritten outcome', () => {
    it('replaces differing content under the replace policy', () => {
      using tree = createTempTree({ 'config.ts': 'old\n' });
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'new\n', { conflictPolicy: 'replace' });

      expect(result).toStrictEqual({ filePath, outcome: 'overwritten' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('new\n');
    });

    // The postcondition the policy promises: after a successful replace, the bytes on disk are exactly `content`.
    // A normalized comparison here would report `up-to-date` and leave the file differing from what was asked for.
    it('replaces content differing only in trailing whitespace', () => {
      using tree = createTempTree({ 'config.ts': 'line one  \nline two\n\n' });
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'line one\nline two\n', { conflictPolicy: 'replace' });

      expect(result).toStrictEqual({ filePath, outcome: 'overwritten' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('line one\nline two\n');
    });
  });

  describe('up-to-date outcome', () => {
    it('reports byte-identical content under the replace policy', () => {
      using tree = createTempTree({ 'config.ts': 'same\n' });
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'same\n', { conflictPolicy: 'replace' });

      expect(result).toStrictEqual({ filePath, outcome: 'up-to-date' });
    });

    it('tolerates trailing-whitespace drift under the skip policy, leaving the file untouched', () => {
      using tree = createTempTree({ 'config.ts': 'line one  \nline two\n\n' });
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'line one\nline two\n', { conflictPolicy: 'skip' });

      expect(result).toStrictEqual({ filePath, outcome: 'up-to-date' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('line one  \nline two\n\n');
    });
  });

  describe('skipped outcome', () => {
    it('leaves a differing file alone when no options are passed', () => {
      using tree = createTempTree({ 'config.ts': 'mine\n' });
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'theirs\n');

      expect(result).toStrictEqual({ filePath, outcome: 'skipped' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('mine\n');
    });

    // A directory stands in for any existing entry that cannot be read as text.
    it('reports why an existing entry could not be read for comparison', () => {
      using tree = createTempTree({ 'config.ts/': '' });
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'theirs\n', { conflictPolicy: 'skip' });

      expect(result).toStrictEqual({ filePath, outcome: 'skipped', error: expect.any(String) });
    });
  });

  describe('failed outcome', () => {
    it('reports a parent directory that cannot be created', () => {
      using tree = createTempTree({ blocker: 'not a directory\n' });
      const filePath = tree.resolve('blocker/config.ts');

      const result = reconcileFile(filePath, 'content\n', { conflictPolicy: 'replace' });

      expect(result).toStrictEqual({ filePath, outcome: 'failed', error: expect.any(String) });
    });

    it('reports a target that cannot be written', () => {
      using tree = createTempTree({ 'config.ts/': '' });
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'content\n', { conflictPolicy: 'replace' });

      expect(result).toStrictEqual({ filePath, outcome: 'failed', error: expect.any(String) });
    });
  });

  describe('dry run', () => {
    it('reports created without writing the file or its parent directories', () => {
      using tree = createTempTree({});
      const filePath = tree.resolve('.github/workflows/audit.yaml');

      const result = reconcileFile(filePath, 'name: Audit\n', { isDryRun: true });

      expect(result).toStrictEqual({ filePath, outcome: 'created' });
      expect(fs.existsSync(tree.resolve('.github'))).toBe(false);
    });

    it('reports overwritten without writing', () => {
      using tree = createTempTree({ 'config.ts': 'old\n' });
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'new\n', { conflictPolicy: 'replace', isDryRun: true });

      expect(result).toStrictEqual({ filePath, outcome: 'overwritten' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('old\n');
    });

    it('reports skipped without writing', () => {
      using tree = createTempTree({ 'config.ts': 'mine\n' });
      const filePath = tree.resolve('config.ts');

      const result = reconcileFile(filePath, 'theirs\n', { isDryRun: true });

      expect(result).toStrictEqual({ filePath, outcome: 'skipped' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('mine\n');
    });
  });
});
