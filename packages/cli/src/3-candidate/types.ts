/** Declares one flag: its value type, its documentation, and how it is spelled on the command line. */
export interface FlagDefinition {
  type: 'boolean' | 'string' | 'path';
  description: string;
  /** One character, written without a dash. */
  short?: string;
  /** Overrides the kebab-cased key as the long name, written without dashes. */
  long?: string;
  /** Labels the value in help; not allowed on a boolean flag. */
  valueHint?: string;
  /** Restricts a string flag to these values and narrows its type to their union. */
  choices?: readonly string[];
  /** Converts the raw value (a path already resolved) of a string or path flag; a throw becomes an `invalid-value` error. */
  parse?: (raw: string) => unknown;
  /** Applies when the flag is absent, as is, without passing through `parse` or path resolution. */
  default?: unknown;
}

/** Maps each flag's key, which names it as `--` plus the key in kebab case, to its definition. */
export type FlagSchema = Record<string, FlagDefinition>;

/** Declares one positional operand, filled in declaration order. */
export interface OperandDefinition {
  name: string;
  description: string;
  optional?: boolean;
  /** Collects every remaining positional; allowed on the last operand only. */
  variadic?: boolean;
  choices?: readonly string[];
}

/** Declares the flags and operands that `parseArgs` accepts. */
export interface ParseSpec<
  S extends FlagSchema = FlagSchema,
  O extends readonly OperandDefinition[] = readonly OperandDefinition[],
> {
  flags?: CheckedFlags<S>;
  operands?: O;
}

/** Options that control where paths resolve and where parsing stops. */
export interface ParseOptions {
  /** The directory against which a path flag resolves; defaults to the working directory. */
  baseDir?: string;
  /** Stops at the first positional or `--` and returns it and everything after it, unparsed, in `rest`. */
  stopAtPositional?: boolean;
}

/** Infers each flag's parsed value from its definition. */
export type ParsedFlags<S extends FlagSchema> = {
  -readonly [K in keyof S]: S[K] extends { type: 'boolean' }
    ? boolean
    : S[K] extends { default: unknown }
      ? FlagValue<S[K]>
      : FlagValue<S[K]> | undefined;
};

/** Infers each operand's parsed value, keyed by its name. */
export type ParsedOperands<O extends readonly OperandDefinition[]> = {
  [D in O[number] as D['name']]: D extends { variadic: true }
    ? OperandValue<D>[]
    : D extends { optional: true }
      ? OperandValue<D> | undefined
      : OperandValue<D>;
};

/** The typed result of `parseArgs`. */
export interface ParseResult<
  S extends FlagSchema = FlagSchema,
  O extends readonly OperandDefinition[] = readonly OperandDefinition[],
> {
  flags: ParsedFlags<S>;
  operands: ParsedOperands<O>;
  /** The unparsed remainder under `stopAtPositional`; otherwise empty. */
  rest: string[];
}

// region | Helpers

/** Requires each flag's `default`, when declared, to have the flag's value type. */
export type CheckedFlags<S extends FlagSchema> = S & { readonly [K in keyof S]: { default?: FlagDefault<S[K]> } };

/** Leaves the default of an erased definition unconstrained, since its value type is not known. */
type FlagDefault<F extends FlagDefinition> = FlagDefinition extends F ? unknown : FlagValue<F>;

type FlagValue<F extends FlagDefinition> = F extends { parse: (raw: string) => infer T }
  ? T
  : F extends { type: 'boolean' }
    ? boolean
    : F extends { choices: readonly (infer U extends string)[] }
      ? U
      : string;

type OperandValue<D extends OperandDefinition> = D extends { choices: readonly (infer U extends string)[] }
  ? U
  : string;

// endregion | Helpers
