import { describe, expect, it } from 'vitest';

import { FOR_TESTING, replaceDeep } from '../replaceDeep.js';

describe('replaceDeep()', () => {
  const deepTarget = {
    a10: {
      a20: 'old 1',
      a21: {
        a30: 'old 2',
        a31: [{ c: 'old 3' }],
        a32: ['old 4'],
      },
    },
    b10: 'old 5',
  };

  function replace(previousValue: unknown): unknown {
    return typeof previousValue === 'string' && previousValue.startsWith('old')
      ? previousValue.replace('old', 'new')
      : previousValue;
  }
  const expectedResult = {
    a10: {
      a20: 'new 1',
      a21: {
        a30: 'new 2',
        a31: [{ c: 'new 3' }],
        a32: ['new 4'],
      },
    },
    b10: 'new 5',
  };

  it('when target is an object, recursively replaces nested values', () => {
    const actualResult = replaceDeep(deepTarget, replace);

    expect(actualResult).toStrictEqual(expectedResult);
  });

  it('when target is an array, returns a new array containing the result of calling replaceDeep on each item in the array', () => {
    const actualResult = replaceDeep([deepTarget, deepTarget], replace);

    expect(actualResult).toStrictEqual([expectedResult, expectedResult]);
  });

  it('when target is not an object or array, returns the target without alteration', () => {
    const targets = ['a', 1, false, null, () => true];

    const results = targets.map(target => replaceDeep(target, replace));

    expect(results).toStrictEqual(targets);
  });

  it('when checkCondition function is given, values are replaced only if the condition evaluates to truthy', () => {
    function checkCondition(previousValue: unknown): boolean {
      return typeof previousValue === 'string' && previousValue.endsWith('3');
    }
    const expectedConditionalResult = {
      a10: {
        a20: 'old 1',
        a21: {
          a30: 'old 2',
          a31: [{ c: 'new 3' }],
          a32: ['old 4'],
        },
      },
      b10: 'old 5',
    };

    const actualResult = replaceDeep(deepTarget, replace, { checkCondition });

    expect(actualResult).toStrictEqual(expectedConditionalResult);
  });
});

// region | ----- Tests of helper functions ----- |
const { replaceArrayValues, replaceObjectValues, resolveValue } = FOR_TESTING;
describe('replaceArrayValues()', () => {
  it('returns a new array in which all values have been replaced by the new value', () => {
    const value = 'new';
    const target = ['old 1', 'old 2'];
    const expectedResult = ['new', 'new'];

    const actualResult = replaceArrayValues(target, value);

    expect(actualResult).toStrictEqual(expectedResult);
  });

  it('if the array is empty, returns a new empty array', () => {
    const value = 'new';
    const target = [];
    const expectedResult = [];

    const actualResult = replaceArrayValues(target, value);

    expect(actualResult).toStrictEqual(expectedResult);
    expect(actualResult).not.toBe(target);
  });

  it('if the value is a function, uses its return value as the value', () => {
    const value = () => 'new';
    const target = ['old 1', 'old 2'];
    const expectedResult = ['new', 'new'];

    const actualResult = replaceArrayValues(target, value);

    expect(actualResult).toStrictEqual(expectedResult);
  });

  it('if the value is a function, passes the current value to the function', () => {
    const value = (previousValue: string) => previousValue.replace('old', 'new');
    const target = [
      'old 1',
      'old 2',
    ];
    const expectedResult = [
      'new 1',
      'new 2',
    ];

    const actualResult = replaceArrayValues(target, value);

    expect(actualResult).toStrictEqual(expectedResult);
  });

  it('if a condition function is given, the replacement occurs only if the condition evaluates to truthy', () => {
    const value = 'replaced!';
    const target = [
      'replace me',
      'do not replace me',
    ];
    function checkCondition(previousValue: unknown): boolean {
      return typeof previousValue === 'string' && previousValue === 'replace me';
    }
    const expectedResult = [
      'replaced!',
      'do not replace me',
    ];

    const actualResult = replaceArrayValues(target, value, { checkCondition });

    expect(actualResult).toStrictEqual(expectedResult);
  });
});

describe('replaceObjectValues()', () => {
  it('returns a new object in which all values have been replaced by the new value', () => {
    const value = 'new';
    const target = {
      a: 'old 1',
      b: 'old 2',
    };
    const expectedResult = {
      a: 'new',
      b: 'new',
    };

    const actualResult = replaceObjectValues(target, value);

    expect(actualResult).toStrictEqual(expectedResult);
  });

  it('if the object is empty, returns a new empty object', () => {
    const value = 'new';
    const target = {};
    const expectedResult = {};

    const actualResult = replaceObjectValues(target, value);

    expect(actualResult).toStrictEqual(expectedResult);
    expect(actualResult).not.toBe(target);
  });

  it('if the value is a function, uses its return value as the value', () => {
    const value = () => 'new';
    const target = {
      a: 'old 1',
      b: 'old 2',
    };
    const expectedResult = {
      a: 'new',
      b: 'new',
    };

    const actualResult = replaceObjectValues(target, value);

    expect(actualResult).toStrictEqual(expectedResult);
  });

  it('if the value is a function, passes the current value to the function', () => {
    const value = (previousValue: string) => previousValue.replace('old', 'new');
    const target = {
      a: 'old 1',
      b: 'old 2',
    };
    const expectedResult = {
      a: 'new 1',
      b: 'new 2',
    };

    const actualResult = replaceObjectValues(target, value);

    expect(actualResult).toStrictEqual(expectedResult);
  });

  it('if a condition function is given, the replacement occurs only if the condition evaluates to truthy', () => {
    const value = 'replaced!';
    const target = {
      a: 'replace me',
      b: 'do not replace me',
    };
    function checkCondition(previousValue: unknown): boolean {
      return typeof previousValue === 'string' && previousValue === 'replace me';
    }
    const expectedResult = {
      a: 'replaced!',
      b: 'do not replace me',
    };

    const actualResult = replaceObjectValues(target, value, { checkCondition });

    expect(actualResult).toStrictEqual(expectedResult);
  });
});

describe('resolveValue()', () => {
  const fakePreviousValue = 'previous value';

  it('given a value, returns the value', () => {
    const value = 'value';
    const expectedResult = value;

    const actualResult = resolveValue(value, fakePreviousValue);

    expect(actualResult).toBe(expectedResult);
  });

  it('given a function, invokes the function with the previous value as an argument and returns the result', () => {
    const fn = (previousValue: string): string => previousValue.toUpperCase();
    const expectedResult = 'PREVIOUS VALUE';

    const actualResult = resolveValue(fn, fakePreviousValue);

    expect(actualResult).toBe(expectedResult);
  });
});
