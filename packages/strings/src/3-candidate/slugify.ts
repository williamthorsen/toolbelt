import { arraify } from '@williamthorsen/toolbelt.arrays/candidate';

/**
 * Transforms a string into a URL-friendly slug.
 * @experimental
 * @stage candidate
 */
export function slugify(input: string | number | ReadonlyArray<string | number>, options: SlugifyOptions = {}): string {
  const { separator = '-' } = options;
  // Limited to one character to support the `replace(new RegExp...)` below.
  if (separator.length !== 1) {
    throw new Error('Separator must be a single character.');
  }

  return arraify(input)
    .map((item) => item.toString())
    .join(' ')
    .normalize('NFD')
    .replaceAll(/[\u{300}-\u{36F}]/gu, '') // replace diacritics
    .toLowerCase()
    .trim()
    .replaceAll(/[._-]/g, separator) // replace common separators with separator
    .replaceAll(new RegExp(`[^\\${separator}a-z0-9 ]`, 'g'), '') // remove all chars except letters, numbers, spaces
    .replaceAll(/\s+/g, separator); // replace spaces with separator
}

interface SlugifyOptions {
  separator?: string | undefined;
}
