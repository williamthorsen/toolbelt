/**
 * A connection setting that cannot be resolved: a missing site, email, or token, a site that is not a host, or a
 * host whose tenant-info endpoint answers 4xx, which shows that it is not an Atlassian site. The user fixes it by
 * supplying or correcting the setting.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export class JiraSettingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'JiraSettingError';
  }
}
