import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createTempTree } from '../../1-proposed/createTempTree.ts';
import { reconcileFileFromFile } from '../reconcileFileFromFile.ts';

describe(reconcileFileFromFile, () => {
  describe('reconciliation against the source', () => {
    it('writes a destination that does not exist', () => {
      using tree = createTempTree({ 'template.toml': 'bundled\n' });
      const filePath = tree.resolve('.config/git-cliff.toml');

      const result = reconcileFileFromFile(filePath, tree.resolve('template.toml'));

      expect(result).toStrictEqual({ filePath, outcome: 'created' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('bundled\n');
    });

    it('replaces a differing destination under the replace policy', () => {
      using tree = createTempTree({ 'config.toml': 'mine\n', 'template.toml': 'bundled\n' });
      const filePath = tree.resolve('config.toml');

      const result = reconcileFileFromFile(filePath, tree.resolve('template.toml'), { conflictPolicy: 'replace' });

      expect(result).toStrictEqual({ filePath, outcome: 'overwritten' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('bundled\n');
    });

    it('reports a destination that already matches the source', () => {
      using tree = createTempTree({ 'config.toml': 'bundled\n', 'template.toml': 'bundled\n' });
      const filePath = tree.resolve('config.toml');

      const result = reconcileFileFromFile(filePath, tree.resolve('template.toml'));

      expect(result).toStrictEqual({ filePath, outcome: 'up-to-date' });
    });

    it('leaves a differing destination alone under the default policy', () => {
      using tree = createTempTree({ 'config.toml': 'mine\n', 'template.toml': 'bundled\n' });
      const filePath = tree.resolve('config.toml');

      const result = reconcileFileFromFile(filePath, tree.resolve('template.toml'));

      expect(result).toStrictEqual({ filePath, outcome: 'skipped' });
      expect(fs.readFileSync(filePath, 'utf8')).toBe('mine\n');
    });
  });

  describe('unreadable source', () => {
    it('reports failure against the destination when the source does not exist', () => {
      using tree = createTempTree({});
      const filePath = tree.resolve('config.toml');

      const result = reconcileFileFromFile(filePath, tree.resolve('absent.toml'));

      expect(result).toStrictEqual({ filePath, outcome: 'failed', error: expect.any(String) });
      expect(fs.existsSync(filePath)).toBe(false);
    });

    // A directory stands in for any existing entry that cannot be read as text.
    it('reports failure when the source cannot be read', () => {
      using tree = createTempTree({ 'template.toml/': '' });
      const filePath = tree.resolve('config.toml');

      const result = reconcileFileFromFile(filePath, tree.resolve('template.toml'));

      expect(result).toStrictEqual({ filePath, outcome: 'failed', error: expect.any(String) });
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  describe('dry run', () => {
    it('reports created without writing the file or its parent directories', () => {
      using tree = createTempTree({ 'template.toml': 'bundled\n' });
      const filePath = tree.resolve('.config/git-cliff.toml');

      const result = reconcileFileFromFile(filePath, tree.resolve('template.toml'), { isDryRun: true });

      expect(result).toStrictEqual({ filePath, outcome: 'created' });
      expect(fs.existsSync(tree.resolve('.config'))).toBe(false);
    });

    // The source is read to determine the outcome, so a dry run can fail where `reconcileFile`'s cannot.
    it('reports failure when the source does not exist', () => {
      using tree = createTempTree({});
      const filePath = tree.resolve('config.toml');

      const result = reconcileFileFromFile(filePath, tree.resolve('absent.toml'), { isDryRun: true });

      expect(result).toStrictEqual({ filePath, outcome: 'failed', error: expect.any(String) });
    });
  });
});
