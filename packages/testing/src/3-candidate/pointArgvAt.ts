import process from 'node:process';

/**
 * Points `process.argv` at a set of CLI arguments for the enclosing scope and restores the previous value when
 * the scope exits. The caller passes the arguments alone, which is what `process.argv.slice(2)` reports; the
 * executable and script entries are supplied.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * using _argv = pointArgvAt(['--config', 'custom.config.ts']);
 *
 * await strictLint();
 *
 * expect(constructedWith()).toMatchObject({ overrideConfigFile: 'custom.config.ts' });
 */
export function pointArgvAt(args: readonly string[], options: PointArgvAtOptions = {}): PointedArgv {
  const { execPath = process.execPath, scriptPath = 'script' } = options;

  // Copied, so a caller that later mutates its own array cannot change what the scope installed.
  const pointedArgs = [...args];
  const previousArgv = process.argv;

  process.argv = [execPath, scriptPath, ...pointedArgs];

  return {
    args: pointedArgs,

    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
    [Symbol.dispose]() {
      process.argv = previousArgv;
    },
  };
}

/** Options for an argv-pointing scope. */
export interface PointArgvAtOptions {
  /** Entry for `process.argv[0]`, which Node fills with the path of the running executable. */
  execPath?: string;

  /** Entry for `process.argv[1]`, which Node fills with the path of the script that it is running. */
  scriptPath?: string;
}

/** Arguments that `process.argv` carries for the length of a scope. */
export interface PointedArgv extends Disposable {
  /** Arguments installed by the scope, which is what `process.argv.slice(2)` reports. */
  readonly args: readonly string[];
}
