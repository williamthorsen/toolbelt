import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { resolveBinSourceModule } from '../resolveBinSourceModule.ts';

const WRAPPER = "#!/usr/bin/env node\nconst entryPoint = new URL('../dist/esm/bin/tool.js', import.meta.url);\n";

describe(resolveBinSourceModule, () => {
  it('follows a wrapper to the source module that its build output mirrors', () => {
    using tree = createTempDir({ 'bin/tool.js': WRAPPER, 'src/bin/tool.ts': '' });

    expect(resolveBinSourceModule(tree.dir, './bin/tool.js')).toStrictEqual({
      sourcePath: path.join(tree.dir, 'src', 'bin', 'tool.ts'),
    });
  });

  it('reports a target outside bin/', () => {
    using tree = createTempDir({ 'src/bin/tool.ts': '' });

    expect(resolveBinSourceModule(tree.dir, './dist/esm/bin/tool.js')).toStrictEqual({
      fault: 'names no committed wrapper under bin/',
    });
  });

  it('reports a missing wrapper', () => {
    using tree = createTempDir({ 'src/bin/tool.ts': '' });

    expect(resolveBinSourceModule(tree.dir, './bin/tool.js')).toStrictEqual({
      fault: 'reaches no wrapper at bin/tool.js',
    });
  });

  it('reports a wrapper without a shebang', () => {
    using tree = createTempDir({ 'bin/tool.js': WRAPPER.replace('#!/usr/bin/env node\n', ''), 'src/bin/tool.ts': '' });

    expect(resolveBinSourceModule(tree.dir, './bin/tool.js')).toStrictEqual({
      fault: 'reaches a wrapper with no shebang',
    });
  });

  it('reports a wrapper naming no build output', () => {
    using tree = createTempDir({ 'bin/tool.js': '#!/usr/bin/env node\n' });

    expect(resolveBinSourceModule(tree.dir, './bin/tool.js')).toStrictEqual({
      fault: 'reaches a wrapper naming no build output',
    });
  });

  it('reports a build output that mirrors no source module', () => {
    using tree = createTempDir({ 'bin/tool.js': WRAPPER });

    expect(resolveBinSourceModule(tree.dir, './bin/tool.js')).toStrictEqual({
      fault: 'names a build output reaching no source module at src/bin/tool.ts',
    });
  });
});
