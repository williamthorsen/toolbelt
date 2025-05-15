import { assertEquals, assertThrows, describe, it } from '../../dev_deps.ts';
import { withDefaultInput } from '../withDefaultInput.ts';

describe('withDefaultInput()', () => {
  it('returns a new function that accepts an undefined value', () => {
    const double = (value: number) => value * 2;
    const doubleWithDefault = withDefaultInput(double, 1);
    const expectedSum = 2;

    const actualSum = doubleWithDefault(undefined);

    assertEquals(actualSum, expectedSum);
  });

  it('if the function has no parameters, throws an error', () => {
    const fn = () => 1;

    const throwingFn = () => withDefaultInput(fn, 1);

    assertThrows(throwingFn, Error, 'Invalid input. The function must have one parameter.');
  });
});
