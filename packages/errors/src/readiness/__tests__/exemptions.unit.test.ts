import { describe, expect, it } from 'vitest';

import { findExemption } from '../exemptions.ts';

describe(findExemption, () => {
  it('names why a bootstrap wrapper is exempt', () => {
    expect(findExemption('packages/agents/bin/codeassembly.js')).toContain('bootstrap wrapper');
  });

  it('exempts a compiled kit bundle, whose source the sweep already reads', () => {
    expect(findExemption('packages/thrive/.readyup/kits/backend.js')).toContain('compiled kit bundle');
  });

  it('does not exempt a kit source', () => {
    expect(findExemption('packages/thrive/.readyup/kits/backend.ts')).toBeUndefined();
  });

  it('exempts nothing in ordinary source', () => {
    expect(findExemption('src/lib/read.ts')).toBeUndefined();
  });

  it('does not mistake a path merely containing "bin" for a wrapper directory', () => {
    expect(findExemption('src/binding/read.ts')).toBeUndefined();
  });
});
