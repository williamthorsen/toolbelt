import type { CommandNode } from './nodes.ts';
import { resolveLongName } from './resolveLongName.ts';
import type { FlagDefinition, FlagSchema, OperandDefinition } from './types.ts';

/** Options of `renderHelp`. */
export interface RenderHelpOptions {
  /** Appends the `-V, --version` line to the options. */
  version?: boolean;
}

/**
 * Returns the help page of a command or a group, without a trailing newline. `invocation` is the
 * space-joined command path, such as `tb-jira issue list`.
 *
 * The page contains the usage line, the description (else the summary), and then the `Commands:`,
 * `Arguments:`, and `Options:` blocks, each omitted when empty, and the epilog verbatim. Entries appear in
 * declaration order, with `-h, --help` and then `-V, --version` last, and every block's descriptions share
 * one column. A passthrough command's page omits the blocks, since it does not parse its arguments.
 * @category CLI
 * @stage candidate
 */
export function renderHelp<C>(node: CommandNode<C>, invocation: string, options: RenderHelpOptions = {}): string {
  const blocks: Block[] = [];
  let usage: string;

  if (node.kind === 'group') {
    usage = `Usage: ${invocation} [options] <command>`;
    const commands = Object.entries(node.commands).map(([name, command]): Row => {
      const marker = name === node.defaultCommand ? ' (default)' : '';
      return [name, command.summary + marker];
    });
    blocks.push({ title: 'Commands:', rows: commands });
  } else if (node.passthrough) {
    usage = `Usage: ${invocation} [<args>...]`;
  } else {
    const labels = node.operands.map((operand) => formatOperandLabel(operand));
    usage = [`Usage: ${invocation} [options]`, ...labels].join(' ');
    blocks.push({
      title: 'Arguments:',
      rows: node.operands.map((operand, index): Row => [labels[index] ?? '', operand.description]),
    });
  }

  if (node.kind === 'group' || !node.passthrough) {
    blocks.push({ title: 'Options:', rows: listOptionRows(node.flags, options.version === true) });
  }

  const nonEmpty = blocks.filter((block) => block.rows.length > 0);
  const width = Math.max(0, ...nonEmpty.flatMap((block) => block.rows.map(([label]) => label.length)));
  const sections = [
    usage,
    node.description ?? node.summary,
    ...nonEmpty.map((block) =>
      [block.title, ...block.rows.map(([label, description]) => `  ${label.padEnd(width)}  ${description}`)].join('\n'),
    ),
  ];
  if (node.epilog !== undefined) sections.push(node.epilog);
  return sections.join('\n\n');
}

// region | Helpers

interface Block {
  title: string;
  rows: Row[];
}

type Row = [label: string, description: string];

function formatFlagRow(key: string, definition: FlagDefinition): Row {
  const longName = `--${resolveLongName(key, definition)}`;
  const names = definition.short === undefined ? `    ${longName}` : `-${definition.short}, ${longName}`;
  const label = definition.type === 'boolean' ? names : `${names} <${formatValueLabel(definition)}>`;
  const suffix = 'default' in definition ? ` (default: ${String(definition.default)})` : '';
  return [label, definition.description + suffix];
}

function formatOperandLabel(operand: OperandDefinition): string {
  const label = operand.variadic === true ? `<${operand.name}>...` : `<${operand.name}>`;
  return operand.optional === true ? `[${label}]` : label;
}

/** Returns the value label: the hint, else the choices joined by `|`, else `value`. */
function formatValueLabel(definition: FlagDefinition): string {
  return definition.valueHint ?? definition.choices?.join('|') ?? 'value';
}

function listOptionRows(flags: FlagSchema, hasVersion: boolean): Row[] {
  const rows = Object.entries(flags).map(([key, definition]) => formatFlagRow(key, definition));
  rows.push(['-h, --help', 'Print this help']);
  if (hasVersion) rows.push(['-V, --version', 'Print the version']);
  return rows;
}

// endregion | Helpers
