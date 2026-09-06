import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { hasSourceFile } from '../hasSourceFile.ts';

describe(hasSourceFile, () => {
  it.each([
    { entries: { 'tier/index.ts': '' }, label: 'a directory holding a TypeScript file' },
    { entries: { 'tier/nested/deep.ts': '' }, label: 'a directory holding one below the top level' },
    { entries: { 'tier/__tests__/covered.unit.test.ts': '' }, label: 'a directory holding one under __tests__' },
  ])('returns true for $label', ({ entries }) => {
    using tree = createTempDir(entries);

    expect(hasSourceFile(path.join(tree.dir, 'tier'))).toBe(true);
  });

  it.each([
    { entries: { 'tier/': '' }, label: 'an empty directory' },
    { entries: { 'tier/notes.md': '' }, label: 'a directory holding no TypeScript file' },
    { entries: {}, label: 'a directory that does not exist' },
  ])('returns false for $label', ({ entries }) => {
    using tree = createTempDir(entries);

    expect(hasSourceFile(path.join(tree.dir, 'tier'))).toBe(false);
  });
});
