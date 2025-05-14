import fs from 'node:fs/promises';
import path from 'node:path';

import { build, type Plugin } from 'esbuild';
import { glob } from 'glob';

const aliases = {
  '~src/': 'src/',
};

const entryPoints = await glob(['src/**/*.ts'], {
  ignore: ['**/__tests__/**'],
});

await build({
  entryPoints,
  outdir: 'dist/esm/',
  format: 'esm',
  bundle: false,
  sourcemap: false,
  platform: 'node',
  target: ['es2022'],
  plugins: [rewriteTsExtensions()],
});

function rewriteTsExtensions(): Plugin {
  return {
    name: 'rewrite-ts-extensions',
    setup(build) {
      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        const fileDir = path.dirname(args.path);
        let code = await fs.readFile(args.path, 'utf8');

        code = resolveAliasImports(code, fileDir, aliases);
        code = rewriteTsImportExtensions(code);

        return { contents: code, loader: 'ts' };
      });
    },
  };
}

/**
 * Rewrites alias import paths to relative filesystem paths from the importing file.
 *
 * @param code - The TypeScript source code.
 * @param fileDir - The absolute path to the importing file’s directory.
 * @param aliasMap - A map of alias prefixes (e.g. '@/') to base paths (e.g. 'src/').
 */
function resolveAliasImports(code: string, fileDir: string, aliasMap: Record<string, string>): string {
  for (const [alias, targetDir] of Object.entries(aliasMap)) {
    const escaped = alias.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`); // escape regex
    const regex = new RegExp(`(?<=from\\s+['"])${escaped}([^'"]+)(?=['"])`, 'g');

    code = code.replace(regex, (_, subpath: string) => {
      const absolute = path.resolve(targetDir, subpath);
      const relative = path.relative(fileDir, absolute);
      return relative.startsWith('.') ? relative : `./${relative}`;
    });
  }

  return code;
}

/**
 * Rewrites relative imports ending in `.ts` to `.js` to match compiled output.
 */
function rewriteTsImportExtensions(code: string): string {
  return code.replaceAll(/(?<=from\s+['"])(\.{1,2}\/[^'"]+)\.ts(?=['"])/g, '$1.js');
}
