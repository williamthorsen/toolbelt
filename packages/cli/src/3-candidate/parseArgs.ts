import path from 'node:path';
import process from 'node:process';

import { ParseError } from './ParseError.ts';
import { resolveLongName } from './resolveLongName.ts';
import { findFlagEntry, tokenizeArgs } from './tokenizeArgs.ts';
import type { FlagDefinition, FlagSchema, OperandDefinition, ParseOptions, ParseResult, ParseSpec } from './types.ts';
import { validateSpec } from './validateSpec.ts';

/** Options of the parse that a group runs, which may also stop at the first flag that it does not claim. */
interface ParseModeOptions extends ParseOptions {
  stopAtUnclaimedFlag?: boolean;
}

/**
 * Parses arguments strictly against a spec and returns typed flags and operands.
 *
 * Throws a plain `Error` on an invalid spec and a `ParseError` on the first offending argument: an unknown
 * flag; a value-taking flag without a value (absent, empty as `--flag=`, or the next argument when it starts
 * with `-` and is not `-` itself); a boolean flag given a value; a positional beyond the declared operands;
 * a missing required operand; a value outside `choices`; or a value on which `parse` throws. A repeated flag
 * takes its last value. An absent boolean flag is `false`, an absent value flag takes its `default` or is
 * `undefined`, an absent optional operand is `undefined`, and an absent variadic operand is `[]`.
 * @category CLI
 * @stage candidate
 */
export function parseArgs<
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- A spec without flags parses to an empty `flags` object.
  const S extends FlagSchema = Record<never, never>,
  const O extends readonly OperandDefinition[] = [],
>(argv: readonly string[], spec: ParseSpec<S, O>, options: ParseOptions = {}): ParseResult<S, O> {
  validateSpec(spec);
  return parseValidatedArgs(argv, spec, options);
}

/** Parses arguments against a spec that has already been validated. */
export function parseValidatedArgs<S extends FlagSchema, O extends readonly OperandDefinition[]>(
  argv: readonly string[],
  spec: ParseSpec<S, O>,
  options: ParseModeOptions = {},
): ParseResult<S, O> {
  const schema: FlagSchema = spec.flags ?? {};
  const operandDefinitions: readonly OperandDefinition[] = spec.operands ?? [];
  const baseDir = options.baseDir ?? process.cwd();
  const stopAtPositional = options.stopAtPositional === true || options.stopAtUnclaimedFlag === true;

  const { tokens, flagsByName } = tokenizeArgs(argv, schema);
  const flags: Record<string, unknown> = {};
  for (const [key, definition] of Object.entries(schema)) {
    flags[key] = 'default' in definition ? definition.default : initialValue(definition);
  }

  const positionals: string[] = [];
  let rest: string[] = [];
  for (const token of tokens) {
    if (stopAtPositional && token.kind !== 'option') {
      rest = argv.slice(token.index);
      break;
    }
    if (token.kind === 'option-terminator') continue;
    if (token.kind === 'positional') {
      acceptPositional(token.value, positionals, operandDefinitions);
      continue;
    }

    const entry = findFlagEntry(flagsByName, token);
    if (entry === undefined) {
      if (options.stopAtUnclaimedFlag === true) {
        rest = argv.slice(token.index);
        break;
      }
      throw new ParseError('unknown-flag', token.rawName, `Unknown option: ${token.rawName}`);
    }
    flags[entry.key] = readFlagValue(token, entry.key, entry.definition, baseDir);
  }

  const operands = assignOperands(positionals, operandDefinitions);
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The loops above write one value per key of the spec, of the type that each definition declares; TypeScript cannot follow the dynamic key writes.
  return { flags, operands, rest } as unknown as ParseResult<S, O>;
}

// region | Helpers

/** Validates a positional against the operand slot that it fills, in argument order. */
function acceptPositional(value: string, positionals: string[], definitions: readonly OperandDefinition[]): void {
  const last = definitions.at(-1);
  const definition =
    positionals.length < definitions.length
      ? definitions[positionals.length]
      : last?.variadic === true
        ? last
        : undefined;
  if (definition === undefined) {
    throw new ParseError('unexpected-positional', value, `Unexpected positional argument: ${value}`);
  }
  checkChoice(value, definition.choices, `<${definition.name}>`);
  positionals.push(value);
}

/** Distributes the positionals over the operands, rejecting a missing required one. */
function assignOperands(positionals: string[], definitions: readonly OperandDefinition[]): Record<string, unknown> {
  const operands: Record<string, unknown> = {};
  for (const [index, definition] of definitions.entries()) {
    const value = definition.variadic === true ? positionals.slice(index) : positionals[index];
    const isAbsent = value === undefined || (Array.isArray(value) && value.length === 0);
    if (isAbsent && definition.optional !== true) {
      const label = `<${definition.name}>`;
      throw new ParseError('missing-operand', label, `Missing argument: ${label}`);
    }
    operands[definition.name] = value;
  }
  return operands;
}

/** Returns the value of an absent flag that does not declare a `default`. */
function initialValue(definition: FlagDefinition): false | undefined {
  return definition.type === 'boolean' ? false : undefined;
}

function checkChoice(value: string, choices: readonly string[] | undefined, label: string): void {
  if (choices === undefined || choices.includes(value)) return;
  throw new ParseError(
    'invalid-choice',
    value,
    `Invalid value for ${label}: ${value}. Expected one of: ${choices.join(', ')}`,
  );
}

/** Validates and converts one flag occurrence. */
function readFlagValue(
  token: { rawName: string; value?: string | undefined; inlineValue?: boolean | undefined },
  key: string,
  definition: FlagDefinition,
  baseDir: string,
): unknown {
  if (definition.type === 'boolean') {
    if (token.value !== undefined) {
      throw new ParseError('unexpected-value', token.rawName, `Option does not accept a value: ${token.rawName}`);
    }
    return true;
  }

  const { value } = token;
  // Reject an absent value, an empty `--flag=`, and a value that is actually the next flag (`-` alone is a value).
  if (value === undefined || value === '' || (token.inlineValue !== true && value.startsWith('-') && value !== '-')) {
    throw new ParseError('missing-value', token.rawName, `Missing value for option: ${token.rawName}`);
  }

  const label = `--${resolveLongName(key, definition)}`;
  checkChoice(value, definition.choices, label);
  const raw = definition.type === 'path' ? path.resolve(baseDir, value) : value;
  if (definition.parse === undefined) return raw;

  try {
    return definition.parse(raw);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ParseError('invalid-value', value, `Invalid value for ${label}: ${value}. ${reason}`, { cause: error });
  }
}

// endregion | Helpers
