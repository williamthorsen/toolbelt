/**
 * A project spec that `parseProjectSpec` rejects, because the text is not JSON or does not have the spec's shape.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export class ProjectSpecError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'ProjectSpecError';
  }
}
