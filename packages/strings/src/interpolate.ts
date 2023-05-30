/**
 * Replaces the placeholders in a string with the values passed in the dictionary object.
 * If a placeholder does not match any key in the dictionary, it is left unchanged.
 * If a placeholder matches multiple keys in the dictionary, all occurrences are replaced.
 */
export function interpolate<K extends string>(
  text: string,
  dictionary: Record<K, string>,
  options: Options = {}
): string {
  const { missingKeyBehavior = 'leave' } = options;
  const placeholderRegex = /{([a-zA-Z_]+[a-zA-Z0-9_]*)}/g;
  return text.replace(placeholderRegex, (match, placeholder: K): string => {
    if (placeholder in dictionary) {
      return dictionary[placeholder];
    }
    else {
      return missingKeyBehavior === 'replace' ? placeholder : match;
    }
  });
}

interface Options {
  missingKeyBehavior?: 'leave' | 'replace';
}
