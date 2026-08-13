const EXEMPTIONS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /(?:^|\/)bin\//,
    reason: 'a bootstrap wrapper imports nothing, so its build-first message survives an incomplete install',
  },
  {
    pattern: /(?:^|\/)\.readyup\/kits\/.+\.js$/,
    reason:
      'a compiled kit bundle is generated from a source the sweep already reads, and editing it breaks its recorded hash',
  },
  { pattern: /(?:^|\/)__tests__\//, reason: 'a test constructs error shapes deliberately' },
  { pattern: /\.(?:spec|test)\.[cm]?[jt]sx?$/, reason: 'a test constructs error shapes deliberately' },
  { pattern: /(?:^|\/)node_modules\//, reason: 'a dependency is not the reader’s code' },
];

/**
 * Returns why a path is exempt from error-handling checks, or nothing where it is not.
 *
 * @internal
 */
export function findExemption(path: string): string | undefined {
  return EXEMPTIONS.find((exemption) => exemption.pattern.test(path))?.reason;
}
