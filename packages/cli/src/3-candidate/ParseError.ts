import { UsageError } from './UsageError.ts';

/** Discriminates the failure modes that `parseArgs` reports. */
export type ParseErrorKind =
  | 'invalid-choice'
  | 'invalid-value'
  | 'missing-operand'
  | 'missing-value'
  | 'unexpected-positional'
  | 'unexpected-value'
  | 'unknown-flag';

/**
 * Reports input that does not match a parse spec. `token` is the offending input as typed: a flag's
 * name, a rejected value, or, for `missing-operand`, the operand's label.
 * @category CLI
 * @stage candidate
 */
export class ParseError extends UsageError {
  readonly kind: ParseErrorKind;
  readonly token: string;

  constructor(kind: ParseErrorKind, token: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ParseError';
    this.kind = kind;
    this.token = token;
  }
}
