/** The help flag, which `runCli` intercepts at every level and which no schema may declare. */
export const HELP_FLAG = { long: 'help', short: 'h' };

/** The version flag, which `runCli` intercepts at the root when given a version. */
export const VERSION_FLAG = { long: 'version', short: 'V' };

/** Returns the flags that `runCli` intercepts in a scope, the version flag only where the scope reserves it. */
export function listReservedFlags(withVersion: boolean): Array<{ long: string; short: string }> {
  return withVersion ? [HELP_FLAG, VERSION_FLAG] : [HELP_FLAG];
}
