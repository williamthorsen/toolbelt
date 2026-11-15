/**
 * A refusal to act on a Jira project: The project is in a state that this package does not support, such as one
 * without a board of its own or one that is not team-managed, or a write would drop a status or a transition or
 * leave a status that nothing can move a work item into. Nothing has been written when it is thrown.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export class JiraRefusalError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'JiraRefusalError';
  }
}
