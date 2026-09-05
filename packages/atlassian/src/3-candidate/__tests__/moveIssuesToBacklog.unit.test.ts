import { describe, expect, it } from 'vitest';

import { createFakeRequest } from '../../test-utils/createFakeRequest.ts';
import { moveIssuesToBacklog } from '../moveIssuesToBacklog.ts';

const BOARD_ID = 7;
const BACKLOG_PATH = `POST /rest/agile/1.0/backlog/${BOARD_ID}/issue`;

describe(moveIssuesToBacklog, () => {
  it('splits 51 keys into a batch of 50 and a batch of 1, carrying the right keys in each', async () => {
    const keys = buildKeys(51);
    const { calls, request } = createFakeRequest({ [BACKLOG_PATH]: { json: {} } });

    const result = await moveIssuesToBacklog(request, BOARD_ID, keys);

    expect(result).toStrictEqual({ batches: 2, moved: 51 });
    expect(calls[0]?.body).toStrictEqual({ issues: keys.slice(0, 50) });
    expect(calls[1]?.body).toStrictEqual({ issues: ['THOR-51'] });
  });

  it('sends one batch where the keys fit exactly', async () => {
    const { calls, request } = createFakeRequest({ [BACKLOG_PATH]: { json: {} } });

    const result = await moveIssuesToBacklog(request, BOARD_ID, buildKeys(50));

    expect(result).toStrictEqual({ batches: 1, moved: 50 });
    expect(calls).toHaveLength(1);
  });

  it('issues no call for an empty key list', async () => {
    const { calls, request } = createFakeRequest({});

    await expect(moveIssuesToBacklog(request, BOARD_ID, [])).resolves.toStrictEqual({ batches: 0, moved: 0 });
    expect(calls).toStrictEqual([]);
  });

  it('throws naming the batch size where a move is rejected', async () => {
    const { request } = createFakeRequest({ [BACKLOG_PATH]: { json: { errorMessages: [] }, status: 400 } });

    await expect(moveIssuesToBacklog(request, BOARD_ID, buildKeys(3))).rejects.toMatchObject({
      label: 'move 3 work items to the backlog',
      status: 400,
    });
  });
});

// region | Helpers

/** Builds sequentially numbered work-item keys, which makes a batch boundary readable in an assertion. */
function buildKeys(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `THOR-${index + 1}`);
}

// endregion | Helpers
