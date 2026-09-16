import {
  detectOutputStyle,
  type DetectOutputStyleOptions,
  OUTPUT_STYLES,
  type OutputStyle,
} from './detectOutputStyle.ts';

export const OUTPUT_STYLE_SETTINGS = ['auto', ...OUTPUT_STYLES] as const;

/** Everything a flag or an environment variable accepts, `auto` standing for whatever detection reports. */
export type OutputStyleSetting = (typeof OUTPUT_STYLE_SETTINGS)[number];

// The settings widened to strings, so that an arbitrary input can be tested for membership without a cast.
const ACCEPTED_SETTINGS: ReadonlySet<string> = new Set<string>(OUTPUT_STYLE_SETTINGS);

// The argument after which every remaining argument is positional.
const POSITIONAL_TERMINATOR = '--';

/** Composes the usage message for a source that named a style that does not exist. */
export function describeInvalidOutputStyle(invalid: InvalidOutputStyle): string {
  const { source, value } = invalid;

  return `${source} must be one of: ${OUTPUT_STYLE_SETTINGS.join(', ')} (got ${JSON.stringify(value)})`;
}

/**
 * Resolves the style to render in: the flag, else the environment variable, else detection.
 *
 * `flag` and `envVar` are the caller's own names, and an omitted one drops that source from the chain. A value of
 * `''` reads as absent, which keeps an unset-looking export from shadowing detection.
 *
 * Never throws. A value naming no style is reported through `invalid` rather than raised, because the caller has to
 * render its complaint in some style, and a resolver that threw would leave it none. Resolution continues past such
 * a value, so the style comes from whatever the next source says.
 *
 * @category Terminal
 * @experimental
 * @stage candidate
 */
export function resolveOutputStyle(options: ResolveOutputStyleOptions): OutputStyleResolution {
  const { argv, env, envVar, flag, isTty } = options;

  const candidates = [
    { source: flag, value: flag === undefined ? undefined : findFlagValue(argv, flag) },
    { source: envVar, value: envVar === undefined ? undefined : env[envVar] },
  ];

  let invalid: InvalidOutputStyle | undefined;
  let setting: OutputStyleSetting | undefined;

  for (const { source, value } of candidates) {
    if (source === undefined || value === undefined || value === '') {
      continue;
    }
    if (!isOutputStyleSetting(value)) {
      invalid ??= { source, value };
      continue;
    }
    setting = value;
    break;
  }

  const style = setting === undefined || setting === 'auto' ? detectOutputStyle({ env, isTty }) : setting;

  return invalid === undefined ? { style } : { invalid, style };
}

export interface InvalidOutputStyle {
  /** The flag or environment variable that named the value, spelled as the caller spells it. */
  readonly source: string;
  readonly value: string;
}

export interface OutputStyleResolution {
  /** The first value that no source accepted, absent where every source named a setting or named nothing. */
  readonly invalid?: InvalidOutputStyle | undefined;
  readonly style: OutputStyle;
}

export interface ResolveOutputStyleOptions extends DetectOutputStyleOptions {
  /** Raw arguments, scanned before any parse; at a CLI's entry point these are `process.argv.slice(2)`. */
  readonly argv: readonly string[];
  /** The environment variable holding a standing preference; omitting it drops that source from the chain. */
  readonly envVar?: string | undefined;
  /** The flag naming a style for one invocation, leading dashes included; omitting it drops that source. */
  readonly flag?: string | undefined;
}

// region | Helpers

/**
 * Finds the value that an invocation gives the flag, scanning raw argv ahead of any parse.
 *
 * Reading it without `parseArgs` lets a caller render its own parse failure in the style that the invocation asked
 * for. The scan accepts `--style plain` and `--style=plain`, stops at the `--` terminator, keeps the last
 * occurrence, and takes the argument after a spaced flag whatever it holds, all four matching what `parseArgs`
 * would resolve.
 */
function findFlagValue(argv: readonly string[], flag: string): string | undefined {
  const assignment = `${flag}=`;
  let value: string | undefined;

  for (const [index, arg] of argv.entries()) {
    if (arg === POSITIONAL_TERMINATOR) {
      break;
    }
    if (arg === flag) {
      value = argv[index + 1];
    } else if (arg.startsWith(assignment)) {
      value = arg.slice(assignment.length);
    }
  }

  return value;
}

/** Reports whether a string names a setting that the flag and the environment variable accept. */
function isOutputStyleSetting(value: string): value is OutputStyleSetting {
  return ACCEPTED_SETTINGS.has(value);
}

// endregion | Helpers
