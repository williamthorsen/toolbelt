/**
 * Returns the function that applies to other text the case change turning `source` into `target`, or `undefined`
 * when none applies. Only a lowercase source supports a case change, which is either upper-casing or capitalizing;
 * an identical target takes the identity function whatever its case.
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

  if (source !== source.toLowerCase()) {
    return undefined;
  }

  if (target === source.toUpperCase()) {
    return (text: string) => text.toUpperCase();
  }

  if (target === source.charAt(0).toUpperCase() + source.slice(1)) {
    return (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  return undefined;
}

/** Returns the value unchanged. */
function identity<T>(value: T): T {
  return value;
}

type Transform = (text: string) => string;
