import { describe, expect, it } from 'vitest';

import { createFakeRequest } from '../../test-utils/createFakeRequest.ts';
import { applyBoardFeatures } from '../applyBoardFeatures.ts';

const BOARD = { id: 7 };
const FEATURES_PATH = '/rest/agile/1.0/board/7/features';

describe(applyBoardFeatures, () => {
  it('writes one call per toggle, carrying the feature in the body', async () => {
    const { calls, request } = createFakeRequest({ [`PUT ${FEATURES_PATH}`]: { json: {} } });
    const featureToggles = [
      { feature: 'jsw.agility.backlog', from: 'DISABLED', to: 'ENABLED' },
      { feature: 'jsw.agility.sprints', from: 'ENABLED', to: 'DISABLED' },
    ] as const;

    const applied = await applyBoardFeatures(request, { board: BOARD }, { featureToggles });

    expect(applied).toStrictEqual(featureToggles);
    expect(calls).toStrictEqual([
      { body: { boardId: 7, enabling: true, feature: 'jsw.agility.backlog' }, method: 'PUT', path: FEATURES_PATH },
      { body: { boardId: 7, enabling: false, feature: 'jsw.agility.sprints' }, method: 'PUT', path: FEATURES_PATH },
    ]);
  });

  it('writes nothing where the plan holds no toggle', async () => {
    const { calls, request } = createFakeRequest({});

    await expect(applyBoardFeatures(request, { board: BOARD }, { featureToggles: [] })).resolves.toStrictEqual([]);
    expect(calls).toStrictEqual([]);
  });

  it('throws naming the toggle where the board rejects the write', async () => {
    const { request } = createFakeRequest({ [`PUT ${FEATURES_PATH}`]: { json: {}, status: 403 } });
    const featureToggles = [{ feature: 'jsw.agility.backlog', from: 'DISABLED', to: 'ENABLED' }] as const;

    await expect(applyBoardFeatures(request, { board: BOARD }, { featureToggles })).rejects.toMatchObject({
      label: 'set board feature jsw.agility.backlog to ENABLED',
      status: 403,
    });
  });
});
