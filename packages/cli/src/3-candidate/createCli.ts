import type { BoundCommand, BoundGroup, Command, CommandNode, Group, RunResult, Writer } from './nodes.ts';
import { parseValidatedArgs } from './parseArgs.ts';
import type { CheckedFlags, FlagSchema, OperandDefinition, ParsedFlags, ParsedOperands, ParseSpec } from './types.ts';
import { validateSpec } from './validateSpec.ts';

/** The input of a command's `run`. */
export interface CommandInput<S extends FlagSchema, O extends readonly OperandDefinition[], C> {
  flags: ParsedFlags<S>;
  operands: ParsedOperands<O>;
  context: C;
  stdout: Writer;
  stderr: Writer;
}

/** The input of a passthrough command's `run`, whose arguments arrive unparsed. */
export interface PassthroughInput<C> {
  args: string[];
  context: C;
  stdout: Writer;
  stderr: Writer;
}

/** Defines a command that runs with the context `C`. */
export interface DefineCommand<C> {
  (definition: PassthroughDefinition<C>): Command<C>;
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- A command without flags parses to an empty `flags` object.
  <const S extends FlagSchema = Record<never, never>, const O extends readonly OperandDefinition[] = []>(
    definition: CommandDefinition<S, O, C>,
  ): Command<C>;
}

/**
 * Defines a group whose commands run with the context `C`, or, with `deriveContext`, with the context that it
 * returns from the group's parsed flags and `C`.
 */
export interface DefineGroup<C> {
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- A group without flags parses to an empty `flags` object.
  <const S extends FlagSchema = Record<never, never>>(definition: PlainGroupDefinition<S, C>): Group<C>;
  <const S extends FlagSchema, C2>(definition: DerivedGroupDefinition<S, C, C2>): Group<C>;
}

/** The fields of a command definition other than its passthrough-specific ones. */
export interface CommandDefinition<S extends FlagSchema, O extends readonly OperandDefinition[], C>
  extends ParseSpec<S, O>, Documentation {
  passthrough?: false;
  run: (input: CommandInput<S, O, C>) => RunResult;
}

/** A command definition whose arguments arrive unparsed, help flags included. */
export interface PassthroughDefinition<C> extends Documentation {
  passthrough: true;
  run: (input: PassthroughInput<C>) => RunResult;
}

/** The fields of a group definition other than its commands and `deriveContext`. */
export interface GroupDefinition<S extends FlagSchema> extends Documentation {
  /** Global options of the group, accepted only before its command token. */
  flags?: CheckedFlags<S>;
  /** Runs when the group's level has no command token, as though its name preceded the first argument that the group's flags do not claim. */
  defaultCommand?: string;
}

/**
 * Returns `defineCommand` and `defineGroup` bound to the context type `C`, which `runCli` supplies to the root
 * and which a group's `deriveContext` may replace for its commands. Both validate a definition when it is made
 * and throw a plain `Error` on an invalid one.
 * @category CLI
 * @stage candidate
 */
export function createCli<C>(): { defineCommand: DefineCommand<C>; defineGroup: DefineGroup<C> } {
  function defineCommand(definition: PassthroughDefinition<C>): Command<C>;
  function defineCommand<const S extends FlagSchema, const O extends readonly OperandDefinition[]>(
    definition: CommandDefinition<S, O, C>,
  ): Command<C>;
  function defineCommand(
    definition: PassthroughDefinition<C> | CommandDefinition<FlagSchema, readonly OperandDefinition[], C>,
  ): Command<C> {
    return buildCommand(definition);
  }

  function defineGroup<const S extends FlagSchema>(definition: PlainGroupDefinition<S, C>): Group<C>;
  function defineGroup<const S extends FlagSchema, C2>(definition: DerivedGroupDefinition<S, C, C2>): Group<C>;
  function defineGroup<S extends FlagSchema, C2>(
    definition: GroupDefinition<S> & {
      deriveContext?: (flags: ParsedFlags<S>, context: C) => C2;
      commands: Record<string, CommandNode<C2>>;
    },
  ): Group<C> {
    return buildGroup(definition, definition.deriveContext ?? keepContext);

    /** Passes the group's context through to its commands. */
    function keepContext(_flags: ParsedFlags<S>, context: C): C2 {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Without `deriveContext`, the plain overload has bound the commands to `C`, so `C2` is `C`; the implementation signature cannot express that.
      return context as unknown as C2;
    }
  }

  return { defineCommand, defineGroup };
}

const contextFree = createCli<unknown>();

/**
 * Defines a command that does not read a context. It nests under any group, since its context is `unknown`.
 * @category CLI
 * @stage candidate
 */
export const defineCommand: DefineCommand<unknown> = contextFree.defineCommand;

/**
 * Defines a group whose commands do not read a context, unless its `deriveContext` supplies one.
 * @category CLI
 * @stage candidate
 */
export const defineGroup: DefineGroup<unknown> = contextFree.defineGroup;

// region | Helpers

interface Documentation {
  /** One line, shown in the parent group's `Commands:` block and as the fallback description. */
  summary: string;
  description?: string;
  /** Free text appended verbatim to the help page. */
  epilog?: string;
}

/**
 * A group definition whose commands receive the group's own context type. Its optional `deriveContext` gives the
 * callback contextual types when this overload is tried first, before the derived overload.
 */
type PlainGroupDefinition<S extends FlagSchema, C> = GroupDefinition<S> & {
  deriveContext?: (flags: ParsedFlags<S>, context: C) => C;
  commands: Record<string, CommandNode<C>>;
};

/** A group definition whose commands receive the context that `deriveContext` returns. */
type DerivedGroupDefinition<S extends FlagSchema, C, C2> = GroupDefinition<S> & {
  flags: CheckedFlags<S>;
  deriveContext: (flags: ParsedFlags<S>, context: C) => C2;
  commands: Record<string, CommandNode<C2>>;
};

function buildCommand<C>(
  definition: PassthroughDefinition<C> | CommandDefinition<FlagSchema, readonly OperandDefinition[], C>,
): Command<C> {
  const documentation = {
    summary: definition.summary,
    description: definition.description,
    epilog: definition.epilog,
  };

  if (definition.passthrough === true) {
    const { run } = definition;
    const command: Command<C> = {
      kind: 'command',
      ...documentation,
      flags: {},
      operands: [],
      passthrough: true,
      bind: (context): BoundCommand => ({
        node: command,
        invoke: ({ args, stdout, stderr }) => run({ args: [...args], context, stdout, stderr }),
      }),
    };
    return command;
  }

  validateSpec(definition);
  const { run } = definition;
  const flags = definition.flags ?? {};
  const operands = definition.operands ?? [];
  const command: Command<C> = {
    kind: 'command',
    ...documentation,
    flags,
    operands,
    passthrough: false,
    bind: (context): BoundCommand => ({
      node: command,
      invoke: ({ args, stdout, stderr, baseDir }) => {
        const parsed = parseValidatedArgs(args, { flags, operands }, { baseDir });
        return run({ flags: parsed.flags, operands: parsed.operands, context, stdout, stderr });
      },
    }),
  };
  return command;
}

function buildGroup<S extends FlagSchema, C, C2>(
  definition: GroupDefinition<S> & { commands: Record<string, CommandNode<C2>> },
  deriveContext: (flags: ParsedFlags<S>, context: C) => C2,
): Group<C> {
  const { commands, defaultCommand } = definition;
  validateSpec(definition);
  for (const name of Object.keys(commands)) {
    if (name === '' || name.startsWith('-')) {
      throw new Error(`Command name '${name}' is empty or starts with a dash.`);
    }
  }
  if (defaultCommand !== undefined && !Object.hasOwn(commands, defaultCommand)) {
    throw new Error(`Default command '${defaultCommand}' is not one of the group's commands.`);
  }

  const group: Group<C> = {
    kind: 'group',
    summary: definition.summary,
    description: definition.description,
    epilog: definition.epilog,
    flags: definition.flags ?? {},
    commands,
    defaultCommand,
    bind: (context): BoundGroup => ({
      node: group,
      enter: (args, baseDir) => {
        const parsed = parseValidatedArgs(args, definition, {
          baseDir,
          stopAtPositional: true,
          stopAtUnclaimedFlag: defaultCommand !== undefined,
        });
        const derived = deriveContext(parsed.flags, context);
        return {
          rest: parsed.rest,
          bindCommand: (name) => (Object.hasOwn(commands, name) ? commands[name]?.bind(derived) : undefined),
        };
      },
    }),
  };
  return group;
}

// endregion | Helpers
