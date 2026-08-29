import path from 'node:path';

/** The directories `nmr build` drops as entry points, which is what keeps a module inside one out of `dist`. */
export const SCAFFOLDING_DIRS: ReadonlySet<string> = new Set(['__fixtures__', '__mocks__', '__tests__', 'test-utils']);

/** Reports whether a path passes through a directory holding test scaffolding. */
export function isScaffolding(filePath: string): boolean {
  return filePath.split(path.sep).some((segment) => SCAFFOLDING_DIRS.has(segment));
}
