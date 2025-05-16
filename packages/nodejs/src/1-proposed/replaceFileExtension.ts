import path from 'node:path';

/**
 * Returns the file path computed by replacing the extension in the given file path with the given new extension.
 * If the old extension is not specified, it is assumed to be the substring that begins at the final period in the path.
 * @param filePath - String representing a file name or file path. The file name must come at the very end
 * @param newExtension - The new extension to use
 * @param options - Options
 */
export function replaceFileExtension(
  filePath: string,
  newExtension: string,
  options: ChangeFileExtensionOptions = {},
): string {
  const { oldExtension = path.extname(filePath) } = options;

  if (oldExtension === '') {
    return `${filePath}${newExtension}`;
  }

  if (!filePath.endsWith(oldExtension)) {
    throw new Error(`File path "${filePath}" does not end with extension "${oldExtension}"`);
  }

  return filePath.slice(0, -oldExtension.length) + newExtension;
}

interface ChangeFileExtensionOptions {
  /* The extension to replace; defaults to the value returned by Node's `path.extname` */
  oldExtension?: string;
}
