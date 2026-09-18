/**
 * Parses a `packageManager` manifest value, `<name>@<version>[+<hash>]`, into its parts. The name ends at the first
 * `@` past the first character, so a scoped name parses, and the version ends at the first `+`, which introduces
 * the integrity hash and may itself recur inside one. Returns `undefined` where the name or the version is empty.
 *
 * @category Package managers
 * @experimental
 * @stage candidate
 */
export function parsePackageManagerSpec(spec: string): PackageManagerSpec | undefined {
  const separator = spec.indexOf('@', 1);
  if (separator < 1) return undefined;

  const name = spec.slice(0, separator);
  const versionWithHash = spec.slice(separator + 1);
  const hashStart = versionWithHash.indexOf('+');
  const version = hashStart === -1 ? versionWithHash : versionWithHash.slice(0, hashStart);
  if (version === '') return undefined;

  return { hash: hashStart === -1 ? undefined : versionWithHash.slice(hashStart + 1), name, version };
}

/** The parts of a `packageManager` value. */
export interface PackageManagerSpec {
  /** The integrity hash after the `+`, or `undefined` where the value declares none. */
  readonly hash: string | undefined;
  readonly name: string;
  readonly version: string;
}
