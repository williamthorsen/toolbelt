/**
 * The package's callable exports. A call to one of them counts toward adoption.
 *
 * @internal
 */
export const ADOPTED_EXPORTS: readonly string[] = [
  'findDirectoryChainMatch',
  'listDirectoryChain',
  'listDirectoryChainMatches',
  'loadConfigCascade',
  'reconcileFile',
  'reconcileFileFromFile',
  'replaceFileExtension',
  'writeAtomic',
];
