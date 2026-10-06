import { resolveLongName } from './resolveLongName.ts';
import type { FlagSchema, OperandDefinition } from './types.ts';

const CAMEL_CASE_KEY = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]+)*$/;

/**
 * Throws a plain `Error` on a definition that cannot be parsed or documented consistently. This is a
 * programmer error rather than a usage error, so it is reported when the definition is made.
 */
export function validateSpec(spec: { flags?: FlagSchema; operands?: readonly OperandDefinition[] }): void {
  validateFlags(spec.flags ?? {});
  validateOperands(spec.operands ?? []);
}

// region | Helpers

function validateFlags(flags: FlagSchema): void {
  const longNames = new Set<string>(['help']);
  const shortNames = new Set<string>(['h']);

  for (const [key, definition] of Object.entries(flags)) {
    if (definition.long === undefined && !CAMEL_CASE_KEY.test(key)) {
      throw new Error(`Flag key '${key}' must be camelCase or declare 'long'.`);
    }
    if (definition.long !== undefined && (definition.long === '' || definition.long.startsWith('-'))) {
      throw new Error(`Flag '${key}' declares a long name that is empty or starts with a dash: '${definition.long}'.`);
    }

    const longName = resolveLongName(key, definition);
    if (longNames.has(longName)) {
      throw new Error(`Flag '${key}' reuses the long name --${longName}, which is reserved or already declared.`);
    }
    longNames.add(longName);

    if (definition.short !== undefined) {
      if (definition.short.length !== 1 || definition.short === '-') {
        throw new Error(`Flag '${key}' must declare 'short' as one character other than a dash.`);
      }
      if (shortNames.has(definition.short)) {
        throw new Error(
          `Flag '${key}' reuses the short name -${definition.short}, which is reserved or already declared.`,
        );
      }
      shortNames.add(definition.short);
    }

    validateFlagFields(key, definition);
  }
}

function validateFlagFields(key: string, definition: FlagSchema[string]): void {
  if (definition.type === 'boolean') {
    if (definition.valueHint !== undefined) throw new Error(`Boolean flag '${key}' cannot declare 'valueHint'.`);
    if (definition.parse !== undefined) throw new Error(`Boolean flag '${key}' cannot declare 'parse'.`);
    if ('default' in definition && typeof definition.default !== 'boolean') {
      throw new Error(`Boolean flag '${key}' must declare a boolean 'default'.`);
    }
  }

  const { choices } = definition;
  if (choices === undefined) return;
  if (definition.type !== 'string')
    throw new Error(`Flag '${key}' declares 'choices', which only a string flag takes.`);
  if (choices.length === 0) throw new Error(`Flag '${key}' declares empty 'choices'.`);
  if ('default' in definition && (typeof definition.default !== 'string' || !choices.includes(definition.default))) {
    throw new Error(`Flag '${key}' declares a 'default' that is not one of its 'choices'.`);
  }
}

function validateOperands(operands: readonly OperandDefinition[]): void {
  const names = new Set<string>();
  let hasOptional = false;

  for (const [index, operand] of operands.entries()) {
    if (operand.name === '') throw new Error(`Operand ${index + 1} has an empty name.`);
    if (names.has(operand.name)) throw new Error(`Operand name '${operand.name}' is declared twice.`);
    names.add(operand.name);

    if (operand.optional === true) {
      hasOptional = true;
    } else if (hasOptional) {
      throw new Error(`Required operand '${operand.name}' follows an optional one.`);
    }
    if (operand.variadic === true && index !== operands.length - 1) {
      throw new Error(`Variadic operand '${operand.name}' must be the last operand.`);
    }
    if (operand.choices?.length === 0) throw new Error(`Operand '${operand.name}' declares empty 'choices'.`);
  }
}

// endregion | Helpers
