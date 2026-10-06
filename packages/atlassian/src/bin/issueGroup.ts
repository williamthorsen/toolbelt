import { createCli, type Group } from '@williamthorsen/toolbelt.cli/candidate';

import { issueListCommand } from './issueListCommand.ts';
import type { TbJiraEffects } from './subcommand-support.ts';

const { defineGroup } = createCli<TbJiraEffects>();

/**
 * The `issue` command group, which works with a Jira project's work items.
 *
 * @internal
 */
export const issueGroup: Group<TbJiraEffects> = defineGroup({
  summary: "List a project's work items",
  description: "Work with a Jira project's work items.",
  commands: { list: issueListCommand },
});
