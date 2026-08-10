/**
 * Identifies and returns the function that can transform a lowercase string to match the case of another string.
 * Returns `undefined` if the transformation is impossible or cannot be identified.
 *
 * If the source and the target are already identical, returns an identity function.
 * Else if the source is not lowercase, returns `undefined`.
 * Else if the placeholder is uppercase, returns a toUpperCase function.
 * Else if the placeholder is capitalized, return a toCapitalized function.
 * Else returns `undefined`.
 *
 * @internal
 */
export function deriveCaseTransformer(source: string, target: string): Transform | undefined {
  if (source === target) {
    return identity;
  }

  // Give up if the source cannot be transformed into the target
  if (source.toLowerCase() !== target.toLowerCase()) {
    return undefined;
  }

  // Give up if the source string is not lowercase
  if (source !== source.toLowerCase()) {
    return undefined;
  }

  // If the target string is uppercase, return a toUpperCase function
  if (target === source.toUpperCase()) {
    return (text: string) => text.toUpperCase();
  }

  // If the target string is capitalized, return a toCapitalized function
  if (target === source.charAt(0).toUpperCase() + source.slice(1)) {
    return (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  // Give up and return undefined
  return undefined;
}

function identity<T>(value: T): T {
  return value;
}

type Transform = (text: string) => string;
