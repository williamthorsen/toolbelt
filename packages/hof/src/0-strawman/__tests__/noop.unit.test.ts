import { describe, it } from '../../dev_deps.ts';

import { noop } from '../noop.ts';

describe('noop', () => {
  it('can be invoked without arguments', () => {
    noop();
  });

  it('can be invoked with arguments', () => {
    noop(1);
    noop(1, 2);
    noop(1, 2, 3);
  });
});
