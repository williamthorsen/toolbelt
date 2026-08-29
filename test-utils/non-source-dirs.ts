/** The directories a source walk never descends into: build output, and installed packages. */
export const NON_SOURCE_DIRS: ReadonlySet<string> = new Set(['dist', 'node_modules']);
