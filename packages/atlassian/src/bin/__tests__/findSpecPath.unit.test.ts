import path from 'node:path';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { describe, expect, it } from 'vitest';

import { findSpecPath } from '../findSpecPath.ts';

describe(findSpecPath, () => {
  it('finds a spec in the directory from which it starts', () => {
    using tree = createTempTree({ 'jira-project-spec.json': '{}' });

    expect(findSpecPath(tree.dir)).toBe(path.join(tree.dir, 'jira-project-spec.json'));
  });

  it('ascends to an ancestor, which is how a repo owns one spec for every directory under it', () => {
    using tree = createTempTree({ 'jira-project-spec.json': '{}', 'packages/app/src/.keep': '' });

    expect(findSpecPath(path.join(tree.dir, 'packages/app/src'))).toBe(path.join(tree.dir, 'jira-project-spec.json'));
  });

  it('returns the nearest spec where an ancestor holds one too', () => {
    using tree = createTempTree({
      'jira-project-spec.json': '{}',
      'packages/app/jira-project-spec.json': '{}',
    });

    expect(findSpecPath(path.join(tree.dir, 'packages/app'))).toBe(
      path.join(tree.dir, 'packages/app/jira-project-spec.json'),
    );
  });

  it('names the directory from which it searched, and the flag that skips the search', () => {
    using tree = createTempTree({ '.keep': '' });
    const startDir = path.join(tree.dir, 'nested');

    expect(() => findSpecPath(startDir)).toThrow(/jira-project-spec\.json/);
    expect(() => findSpecPath(startDir)).toThrow(/--spec/);
  });
});
