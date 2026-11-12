/** One reason that a validated value is invalid. */
export interface ValidationError {
  code: string;
  message: string;
}

/** The outcome of a validation, which lists at least one error when the value is invalid. */
export type ValidationResult =
  { isValid: true; errors: [] } | { isValid: false; errors: [ValidationError, ...ValidationError[]] };
