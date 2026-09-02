import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { listPublishedWorkspaceDirectories } from '../private-workspaces.ts';

const WORKSPACE_PATTERNS = 'packages:\n  - packages/*\n';

describe(listPublishedWorkspaceDirectories, () => {
  it('drops a workspace named in the declared private set', () => {
    using tree = createTempDir({
      'pnpm-workspace.yaml': WORKSPACE_PATTERNS,
      'packages/_template/package.json': '{}',
      'packages/strings/package.json': '{}',
    });

    expect(listPublishedWorkspaceDirectories(tree.dir).map((directory) => path.basename(directory))).toStrictEqual([
      'strings',
    ]);
  });

  it('keeps a workspace whose manifest declares itself private but is undeclared', () => {
    using tree = createTempDir({
      'pnpm-workspace.yaml': WORKSPACE_PATTERNS,
      'packages/strings/package.json': JSON.stringify({ private: true }),
    });

    expect(listPublishedWorkspaceDirectories(tree.dir).map((directory) => path.basename(directory))).toStrictEqual([
      'strings',
    ]);
  });
});
