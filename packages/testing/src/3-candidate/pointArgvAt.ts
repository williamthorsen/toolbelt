import process from 'node:process';

/**
 * Points `process.argv` at a set of CLI arguments for the enclosing scope and restores the previous value when
 * the scope exits. The caller passes the arguments alone, which `process.argv.slice(2)` reports;
 * `pointArgvAt` supplies the executable and script entries. Only disposal restores the previous value, so a scope
 * bound with `const` rather than `using` leaves the arguments installed for the rest of the file.
 *
 * The scope assigns a new array rather than mutating the one that it found, so a module that captured
 * `process.argv` before the scope opened keeps reporting what it captured. A spawned child receives the arguments
 * that its own `spawn` call passes, not the ones installed here.
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

  // Copy the arguments, so that a caller that later mutates its own array cannot change what the scope installed.
  const pointedArgs = [...args];
  const previousArgv = process.argv;

  process.argv = [execPath, scriptPath, ...pointedArgs];

  return {
    args: pointedArgs,

    [Symbol.dispose]() {
      process.argv = previousArgv;
    },
  };
}

/** Options for an argv-pointing scope. */
export interface PointArgvAtOptions {
  /**
   * Entry for `process.argv[0]`, which Node fills with the path of the running executable. Defaults to
   * `process.execPath`.
   */
  execPath?: string;

  /**
   * Entry for `process.argv[1]`, which Node fills with the path of the script that it is running. Defaults to the
   * placeholder `script`, which names no file, so code deriving its own directory from it needs a real path here.
   */
  scriptPath?: string;
}

/** Arguments that `process.argv` contains for the length of a scope. */
export interface PointedArgv extends Disposable {
  /** Arguments installed by the scope, which `process.argv.slice(2)` reports. */
  readonly args: readonly string[];
}
