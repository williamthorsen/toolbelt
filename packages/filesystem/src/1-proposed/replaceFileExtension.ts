import path from 'node:path';

/**
 * Returns `filePath` with its extension replaced by `newExtension`.
 *
 * The extension is the substring beginning at the final period in the file name, which must come at the very end
 * of the path. A multi-part extension is indivisible to `path.extname` (`.d.ts` reports as `.ts`), so declare one
 * through `oldExtension` to replace it whole.
 *
 * Either extension may be written with or without its leading period, so `'js'` and `'.js'` are equivalent. An
 * empty `newExtension` removes the extension. Throws when `filePath` ends with a separator, and when `filePath`
 * does not end with a declared `oldExtension`.
 *
 * @example
 * replaceFileExtension('src/main.ts', '.js');                              // 'src/main.js'
 * replaceFileExtension('src/main.d.ts', '.js', { oldExtension: '.d.ts' }); // 'src/main.js'
 *
 * @category Filesystem
 * @experimental
 * @stage proposed
 */
export function replaceFileExtension(
  filePath: string,
  newExtension: string,
  options: ReplaceFileExtensionOptions = {},
): string {
  // Guard before deriving the default: `path.extname` ignores a trailing separator and would report an
  // extension that the `endsWith` check below then rejects, contradicting the function's own default.
  if (endsWithSeparator(filePath)) {
    throw new Error(`File path "${filePath}" ends with a path separator, so it names a directory`);
  }

  const oldExtension = toDotPrefixed(options.oldExtension ?? path.extname(filePath));
  const replacement = toDotPrefixed(newExtension);

  if (oldExtension === '') {
    return `${filePath}${replacement}`;
  }

  if (!filePath.endsWith(oldExtension)) {
    throw new Error(`File path "${filePath}" does not end with extension "${oldExtension}"`);
  }

  return filePath.slice(0, -oldExtension.length) + replacement;
}

export interface ReplaceFileExtensionOptions {
  /** The extension to replace; defaults to the value returned by Node's `path.extname`. */
  oldExtension?: string | undefined;
}

/**
 * Reports whether the path ends with a separator. `/` counts on every platform; the platform separator counts
 * additionally, so a backslash terminates a path on Windows but stays a legal filename character on POSIX.
 */
function endsWithSeparator(filePath: string): boolean {
  return filePath.endsWith('/') || filePath.endsWith(path.sep);
}

/**
 * Returns the extension in dot-prefixed form, passing through the empty string, which means "no extension".
 */
function toDotPrefixed(extension: string): string {
  if (extension === '' || extension.startsWith('.')) return extension;

  return `.${extension}`;
}
