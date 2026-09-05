import type { JiraRequest } from './createTokenTransport.ts';
import { requestOk } from './requestOk.ts';

const BACKLOG_BATCH_SIZE = 50;

/**
 * Moves work items off the board and into the backlog, in the batches the endpoint accepts. An empty key list
 * issues no call.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function moveIssuesToBacklog(
  request: JiraRequest,
  boardId: number,
  keys: readonly string[],
): Promise<BacklogMoveResult> {
  const batches: string[][] = [];
  for (let index = 0; index < keys.length; index += BACKLOG_BATCH_SIZE) {
    batches.push(keys.slice(index, index + BACKLOG_BATCH_SIZE));
  }

  for (const batch of batches) {
    await requestOk(request, {
      body: { issues: batch },
      label: `move ${batch.length} work items to the backlog`,
      method: 'POST',
      path: `/rest/agile/1.0/backlog/${boardId}/issue`,
    });
  }

  return { batches: batches.length, moved: keys.length };
}

/** What a backlog move wrote. */
export interface BacklogMoveResult {
  readonly batches: number;
  readonly moved: number;
}
