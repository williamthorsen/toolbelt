/**
 * The package's callable exports. A call to one of them counts toward adoption.
 *
 * @internal
 */
export const ADOPTED_EXPORTS: readonly string[] = [
  'CliError',
  'createCli',
  'createTextBuffer',
  'defineCommand',
  'defineGroup',
  'ignoreBrokenPipes',
  'installCrashHandler',
  'isAffirmative',
  'ParseError',
  'parseArgs',
  'readAnswer',
  'readStreamText',
  'renderHelp',
  'runCli',
  'UsageError',
];
