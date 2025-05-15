import { assertEquals, describe, it } from '../../dev_deps.ts';
import { evaluate } from '../evaluate.ts';

describe('evaluate', () => {
  it('should return the value if it is not a function', () => {
    assertEquals(evaluate(1), 1);
    assertEquals(evaluate('a'), 'a');
    assertEquals(evaluate({}), {});
    assertEquals(evaluate([]), []);
  });

  it('should call the function and return the result if the value is a function', () => {
    assertEquals(
      evaluate(() => 1),
      1,
    );
    assertEquals(
      evaluate(() => 'a'),
      'a',
    );
    assertEquals(
      evaluate(() => ({})),
      {},
    );
    assertEquals(
      evaluate(() => []),
      [],
    );
  });

  it('can pass arguments to the function', () => {
    const fn = (a: number, b: number) => a + b;
    assertEquals(evaluate(fn, 1, 2), 3);
  });
});
