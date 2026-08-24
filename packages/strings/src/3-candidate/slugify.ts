import { arraify } from '@williamthorsen/toolbelt.arrays/candidate';

/**
 * Transforms a string into a URL-friendly slug.
 * Throws a TypeError if the separator is not a single character.
 * @experimental
 * @stage candidate
 */
export function slugify(input: string | number | ReadonlyArray<string | number>, options: SlugifyOptions = {}): string {
  const { separator = '-' } = options;
  // Limited to one character because the character class below preserves the separator
  // per character, not as a sequence.
  if (separator.length !== 1) {
    throw new TypeError('Separator must be a single character.');
  }

  return arraify(input)
    .map((item) => item.toString())
    .join(' ')
    .normalize('NFD')
    .replaceAll(/[\u{300}-\u{36F}]/gu, '') // replace diacritics
    .toLowerCase()
    .trim()
    .replaceAll(/[._-]/g, () => separator) // replace common separators with separator
    .replaceAll(new RegExp(`[^${RegExp.escape(separator)}a-z0-9 ]`, 'g'), '') // remove all but letters, digits, spaces
    .replaceAll(/\s+/g, () => separator); // replace spaces with separator
}

interface SlugifyOptions {
  separator?: string | undefined;
}
