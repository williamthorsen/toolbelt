import { describe, expect, it } from 'vitest';

import { component } from '../component.ts';

describe(component, () => {
  it('derives all fields from the directory name', () => {
    expect(component('basic')).toStrictEqual({
      tagPrefix: 'basic-v',
      packageFiles: ['packages/basic/package.json'],
      changelogPaths: ['packages/basic'],
      paths: ['packages/basic/**'],
    });
  });

  it('uses a custom tag prefix when provided', () => {
    expect(component('basic', 'my-lib-v')).toStrictEqual({
      tagPrefix: 'my-lib-v',
      packageFiles: ['packages/basic/package.json'],
      changelogPaths: ['packages/basic'],
      paths: ['packages/basic/**'],
    });
  });
});
