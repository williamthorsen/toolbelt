/** A flag that `runCli` intercepts before parsing and that `renderHelp` lists after the declared options. */
export interface ReservedFlag {
  long: string;
  short: string;
  description: string;
}

/** The help flag, which `runCli` intercepts at every level and which no schema may declare. */
export const HELP_FLAG: ReservedFlag = { long: 'help', short: 'h', description: 'Print this help' };

/** The version flag, which `runCli` intercepts at the root when given a version. */
export const VERSION_FLAG: ReservedFlag = { long: 'version', short: 'V', description: 'Print the version' };

/** Returns a reserved flag's names as help and messages spell them, such as `-h, --help`. */
export function formatReservedFlagLabel(flag: ReservedFlag): string {
  return `-${flag.short}, --${flag.long}`;
}

/** Returns the flags that `runCli` intercepts in a scope, the version flag only where the scope reserves it. */
export function listReservedFlags(withVersion: boolean): ReservedFlag[] {
  return withVersion ? [HELP_FLAG, VERSION_FLAG] : [HELP_FLAG];
}
