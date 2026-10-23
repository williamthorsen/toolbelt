/**
 * Replaces one property and returns a function that restores the state that it found: the previous value if the
 * target owned the property, and absence if it did not. Both cases arise, since `process.stdout.write` resolves
 * from the stream's prototype and `isTTY` is unset outside a terminal.
 *
 * @internal
 */
export function swapProperty<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): () => void {
  const hadOwnProperty = Object.hasOwn(target, key);
  const previous = target[key];

  target[key] = value;

  return () => {
    if (hadOwnProperty) target[key] = previous;
    else Reflect.deleteProperty(target, key);
  };
}
