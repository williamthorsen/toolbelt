import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_DIR = path.join(import.meta.dirname, '..');
const TIER_DIR = path.join(SRC_DIR, '1-proposed');
const NON_RUNTIME_SEGMENTS = new Set(['__tests__', 'test-utils']);
const BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

describe('Runtime boundaries', () => {
  it('keeps the AI SDK out of the proposed tier, so that its types stay out of the public API', () => {
    const offenders = listRuntimeModules(TIER_DIR).filter((file) =>
      listImportSpecifiers(readFileSync(file, 'utf8')).some(isAiSdkSpecifier),
    );

    expect(offenders.map((file) => path.relative(SRC_DIR, file))).toStrictEqual([]);
  });

  it('keeps Node builtins out of every runtime module, so that the package runs in a page', () => {
    const offenders = listRuntimeModules(SRC_DIR).filter((file) =>
      listImportSpecifiers(readFileSync(file, 'utf8')).some((specifier) => BUILTINS.has(specifier)),
    );

    expect(offenders.map((file) => path.relative(SRC_DIR, file))).toStrictEqual([]);
  });

  it('finds static, type-only, re-exported, and dynamic imports', () => {
    const source = [
      "import { streamText } from 'ai';",
      "import type { LanguageModel } from '@ai-sdk/provider';",
      "export { createAnthropic } from '@ai-sdk/anthropic';",
      "const fs = await import('node:fs');",
      "import 'path';",
    ].join('\n');

    const specifiers = listImportSpecifiers(source);

    expect(specifiers).toStrictEqual(['ai', '@ai-sdk/provider', '@ai-sdk/anthropic', 'node:fs', 'path']);
    expect(specifiers.filter(isAiSdkSpecifier)).toHaveLength(3);
    expect(specifiers.filter((specifier) => BUILTINS.has(specifier))).toStrictEqual(['node:fs', 'path']);
  });
});

// region | Helpers
/** Reports whether a specifier names the AI SDK or one of its packages. */
function isAiSdkSpecifier(specifier: string): boolean {
  return specifier === 'ai' || specifier.startsWith('ai/') || specifier.startsWith('@ai-sdk/');
}

/** Lists the module specifiers that a source imports or re-exports, statically or dynamically. */
function listImportSpecifiers(source: string): string[] {
  const pattern = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gmu;
  return source
    .matchAll(pattern)
    .map((match) => match[1] ?? '')
    .toArray();
}

/** Lists the `.ts` modules under a directory, outside test directories. */
function listRuntimeModules(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter(
      (file) => file.endsWith('.ts') && file.split(path.sep).every((segment) => !NON_RUNTIME_SEGMENTS.has(segment)),
    )
    .map((file) => path.join(dir, file));
}
// endregion | Helpers
