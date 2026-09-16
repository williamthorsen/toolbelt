export const OUTPUT_STYLES = ['plain', 'rich'] as const;

/** A style that output can actually be rendered in. */
export type OutputStyle = (typeof OUTPUT_STYLES)[number];

// The Linux virtual console, whose kernel font holds a few hundred glyphs and no emoji among them.
const CONSOLE_TERM = 'linux';

/**
 * Detects the style that an environment calls for: rich only where output reaches a person's terminal.
 *
 * Each signal catches what the others miss. `CI` catches a runner that allocates a pseudo-terminal, where the
 * terminal check alone would emit emoji into a log that nobody can grep, and `''` or `'false'` reads as a denial,
 * which is how the wider ecosystem reads it. The terminal check catches an interactive pipe into `grep`, where
 * `CI` is unset, and `CI` is not universal either, since Jenkins does not set it. `TERM=linux` catches the Linux
 * virtual console, a terminal outside CI that draws no emoji at all.
 *
 * `TERM=dumb` and `NO_COLOR` are not read: Each reports absent colour rather than absent Unicode.
 *
 * @category Terminal
 * @experimental
 * @stage candidate
 */
export function detectOutputStyle(options: DetectOutputStyleOptions): OutputStyle {
  const { env, isTty } = options;

  if (!isTty || isCi(env) || env['TERM'] === CONSOLE_TERM) {
    return 'plain';
  }
  return 'rich';
}

export interface DetectOutputStyleOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Whether the stream that receives the output is a terminal, read by the caller from that stream. */
  readonly isTty: boolean;
}

// region | Helpers

/** Reports whether `CI` claims a continuous-integration runner, an exact `''` or `'false'` denying it. */
function isCi(env: DetectOutputStyleOptions['env']): boolean {
  const ci = env['CI'];

  return ci !== undefined && ci !== '' && ci !== 'false';
}

// endregion | Helpers
