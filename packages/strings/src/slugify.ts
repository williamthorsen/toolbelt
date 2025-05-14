export function slugify(input: string | number | ReadonlyArray<string | number>, options: SlugifyOptions = {}): string {
  const { separator = '-' } = options;
  // Limited to one character to support the `replace(new RegExp...)` below.
  if (separator.length !== 1) {
    throw new Error('Separator must be a single character.');
  }

  // The recommended `Array.isArray` call doesn't preserve the type.
  // eslint-disable-next-line unicorn/no-instanceof-builtins
  const inputArray = input instanceof Array ? input : [input];

  return inputArray
    .map((item) => item.toString())
    .join(' ')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '') // replace diacritics
    .toLowerCase()
    .trim()
    .replaceAll(/[._-]/g, separator) // replace common separators with separator
    .replaceAll(new RegExp(`[^\\${separator}a-z0-9 ]`, 'g'), '') // remove all chars except letters, numbers, spaces
    .replaceAll(/\s+/g, separator); // replace spaces with separator
}

interface SlugifyOptions {
  separator?: string | undefined;
}
