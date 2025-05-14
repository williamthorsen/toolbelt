export type StringIndexedMapping = Record<string, string> | string[];

export type StringInterfaceMapping<O> = O extends { [K in keyof O]: string } ? O : never;

export type StringMapping<T> = Map<RegExp | string, string> | StringIndexedMapping | StringInterfaceMapping<T>;

// Ignore the warning about `Function`: We do want to exclude all functions and classes!
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type StrictObject<T> = T extends null | Function | ArrayLike<unknown> ? never : T extends object ? T : never;

export interface ValidationError {
  code: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
