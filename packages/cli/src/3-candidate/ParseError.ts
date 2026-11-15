import { UsageError, type UsageErrorOptions } from './UsageError.ts';

/**
 * Reports input that does not match a parse spec. `token` is the offending input as typed: a flag's
 * name, a rejected value, or, for `missing-operand`, the operand's label.
 * @category CLI
 * @stage candidate
 */
export class ParseError extends UsageError {
  readonly kind: ParseErrorKind;
  readonly token: string;

  constructor(kind: ParseErrorKind, token: string, message: string, options?: UsageErrorOptions) {
    super(message, options);
    this.name = 'ParseError';
    this.kind = kind;
    this.token = token;
  }
}

/** Discriminates the failure modes that `parseArgs` reports. */
export type ParseErrorKind =
  | 'invalid-choice'
  | 'invalid-value'
  | 'missing-operand'
  | 'missing-value'
  | 'unexpected-positional'
  | 'unexpected-value'
  | 'unknown-flag';
