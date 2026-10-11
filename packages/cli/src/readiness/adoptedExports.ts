/**
 * The package's callable exports. A call to one of them counts toward adoption.
 *
 * @internal
 */
export const ADOPTED_EXPORTS: readonly string[] = [
  'createCli',
  'defineCommand',
  'defineGroup',
  'ParseError',
  'parseArgs',
  'readStreamText',
  'renderHelp',
  'runCli',
  'UsageError',
];
