const HEX_FORM_PATTERN = /^0x(?<hex>(?:[\dA-Fa-f]{2})+)(?:\s|$)/;
const PASSWORD_LINE_PATTERN = /^password: ?(?<value>.*)$/m;

const HEX_PREFIX = '0x';
const QUOTE = '"';

/**
 * Extracts the secret from what `security find-generic-password -g` writes to stderr. That command prints the
 * secret in whichever of two forms fits: raw between quotes where every byte is printable ASCII, and
 * `0x<hex>  "<escaped>"` otherwise. Only the hex form is unambiguous, so the quoted form is read verbatim and
 * a value that fits neither throws, since a wrong secret is worse than a failure.
 *
 * @internal
 */
export function parseSecurityPassword(stderr: string): string {
  const value = PASSWORD_LINE_PATTERN.exec(stderr)?.groups?.['value'];
  if (value === undefined) throw new Error(`No password line in the output of \`security\`: ${summarize(stderr)}`);

  if (value.startsWith(HEX_PREFIX)) return decodeHexForm(value);
  if (value === '') return '';

  return readQuotedForm(value);
}

// region | Helpers

/** Decodes the hex form, whose bytes are the secret exactly. */
function decodeHexForm(value: string): string {
  const hex = HEX_FORM_PATTERN.exec(value)?.groups?.['hex'];
  if (hex === undefined) throw new Error(`Malformed hexadecimal password in the output of \`security\`: ${value}`);

  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(hex, 'hex'));
}

/**
 * Reads the quoted form, taking everything between the outer quotes. `security` prints the hex form for any
 * byte outside printable ASCII, a backslash included, so the text between those quotes is the secret itself
 * even where it holds a quote of its own.
 */
function readQuotedForm(value: string): string {
  const end = value.lastIndexOf(QUOTE);
  if (!value.startsWith(QUOTE) || end === 0) {
    throw new Error(`Unquoted password in the output of \`security\`: ${value}`);
  }

  return value.slice(QUOTE.length, end);
}

/** Shortens output for an error message, so a failure names what it read without reproducing all of it. */
function summarize(output: string): string {
  const collapsed = output.trim().replaceAll(/\s+/g, ' ');

  return collapsed.length > 200 ? `${collapsed.slice(0, 200)}...` : collapsed;
}

// endregion | Helpers
