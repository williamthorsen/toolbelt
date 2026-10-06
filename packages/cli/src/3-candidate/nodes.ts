import type { FlagSchema, OperandDefinition } from './types.ts';

/** A destination for output, such as `process.stdout`. */
export interface Writer {
  write(text: string): unknown;
}

/** What a command's `run` returns: an exit code, or nothing for 0, synchronously or as a promise. */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- `number | undefined` would reject a handler annotated `(): void`.
export type RunResult = number | void | Promise<number | void>;

/** A command: a leaf of the command tree, run with the context `C`. */
export interface Command<C> extends NodeDocs {
  readonly kind: 'command';
  readonly flags: FlagSchema;
  readonly operands: readonly OperandDefinition[];
  /** Whether the command receives its arguments unparsed, help flags included. */
  readonly passthrough: boolean;
  /** Supplies the context with which `runCli` invokes the command. */
  readonly bind: (context: C) => BoundCommand;
}

/** A group of commands, which reads its own flags before the command token and may derive its commands' context. */
export interface Group<C> extends NodeDocs {
  readonly kind: 'group';
  readonly flags: FlagSchema;
  /** The group's commands, typed for inspection; `bind` is what supplies their context. */
  readonly commands: Readonly<Record<string, CommandNode<never>>>;
  readonly defaultCommand: string | undefined;
  /** Supplies the context with which `runCli` enters the group. */
  readonly bind: (context: C) => BoundGroup;
}

/** A command or a group, run with the context `C`. */
export type CommandNode<C> = Command<C> | Group<C>;

/** A command whose context is supplied. */
export interface BoundCommand {
  readonly node: Command<never>;
  readonly invoke: (invocation: Invocation) => RunResult;
}

/** A group whose context is supplied. */
export interface BoundGroup {
  readonly node: Group<never>;
  /** Parses the group's flags and derives its commands' context; `rest` begins where the group's flags end. */
  readonly enter: (args: readonly string[], baseDir: string) => GroupEntry;
}

/** The outcome of entering a group. */
export interface GroupEntry {
  readonly rest: string[];
  readonly bindCommand: (name: string) => BoundCommand | BoundGroup | undefined;
}

/** The arguments and effects with which `runCli` invokes a command. */
export interface Invocation {
  readonly args: readonly string[];
  readonly stdout: Writer;
  readonly stderr: Writer;
  readonly baseDir: string;
}

// region | Helpers

interface NodeDocs {
  /** One line, shown in the parent group's `Commands:` block and as the fallback description. */
  readonly summary: string;
  readonly description: string | undefined;
  /** Free text appended verbatim to the help page. */
  readonly epilog: string | undefined;
}

// endregion | Helpers
