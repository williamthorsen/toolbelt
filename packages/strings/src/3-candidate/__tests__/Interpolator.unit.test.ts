import is from '@sindresorhus/is';
import { describe, expect, it } from 'vitest';

import { interpolate, Interpolator, type InterpolatorOptions } from '../Interpolator.ts';

describe(Interpolator, () => {
  describe('static interpolate() & standalone interpolate()', () => {
    it('without an instance, interpolates the template as an instance does', () => {
      const template = '{Salutation} {TITLE} {unmatched} {}';
      const mapping = { salutation: 'dear', title: 'sir' };
      const expected = 'Dear SIR {unmatched} {}';

      const staticActual = Interpolator.interpolate(template, mapping);
      const fnActual = interpolate(template, mapping);

      expect(staticActual).toBe(expected);
      expect(fnActual).toBe(expected);
    });
  });

  describe('collectKeySet()', () => {
    const template = 'not used in this test';

    it('if the mapping contains no keys, returns an empty set', () => {
      const mapping = {};
      const interpolable = new Interpolator(template);
      const expected = new Set();

      const actual = interpolable.collectKeySet({ mapping });

      expect(actual).toStrictEqual(expected);
    });

    it('if the mapping contains entries, returns a unique array of their keys in lower case', () => {
      const mapping = { firstName: 'John', lastName: 'Doe' };
      const interpolable = new Interpolator(template).setOptions({ mapping });
      const expected = new Set(['firstname', 'lastname']);

      const actual = interpolable.collectKeySet();

      expect(actual).toStrictEqual(expected);
    });
  });

  describe('extractPlaceholderSet()', () => {
    it('if the template contains no placeholders, returns an empty array', () => {
      const template = 'Hello, World!';
      const interpolable = new Interpolator(template);
      const expected = new Set();

      const actual = interpolable.extractPlaceholderSet();

      expect(actual).toStrictEqual(expected);
    });

    it('if the template contains placeholders, returns a unique array of them in lower case', () => {
      const template = 'To {firstName} {lastName}! Hello, {firstName}!';
      const interpolable = new Interpolator(template);
      const expected = new Set(['firstname', 'lastname']);

      const actual = interpolable.extractPlaceholderSet();

      expect(actual).toStrictEqual(expected);
    });
  });

  describe('partitionKeysAndPlaceholders()', () => {
    it('partitions keys and placeholders into matches, unmatched keys, and unmatched placeholders', () => {
      const template = '{match1}{templateOnly}{match2}';
      const interpolable = new Interpolator(template);
      const mapping = { mappingOnly: 'value', match1: 'value', match2: 'value' };
      const expected = {
        matches: new Set(['match1', 'match2']),
        unmatchedKeys: new Set(['mappingonly']),
        unmatchedPlaceholders: new Set(['templateonly']),
      };

      const actual = interpolable.partitionKeysAndPlaceholders({ mapping });

      expect(actual).toStrictEqual(expected);
    });
  });

  describe('interpolate()', () => {
    it('when a placeholder matches a key in the mapping, replaces the placeholder with the corresponding value', () => {
      const template = 'Hello, {name}!';
      const mapping = { name: 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('when a placeholder does not match any key in the mapping, leaves the placeholder unchanged', () => {
      const template = 'Hello, {name}!';
      const mapping = { greeting: 'Hi' };
      const expected = 'Hello, {name}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('when multiple occurrences of a placeholder match a key in the mapping, replaces all occurrences with the corresponding value', () => {
      const template = '{delimiter}Hello, {name}!{delimiter}';
      const mapping = { name: 'World', delimiter: '|' };
      const expected = '|Hello, World!|';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('when a placeholder is empty, leaves the placeholder unchanged', () => {
      const template = 'Hello, {}!';
      const mapping = { name: 'World' };
      const expected = 'Hello, {}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('when the template is an empty string, returns an empty string', () => {
      const template = '';
      const mapping = { name: 'World' };
      const expected = '';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('when the mapping is empty, leaves all placeholders unchanged', () => {
      const template = 'Hello, {name}!';
      const mapping = {};
      const expected = 'Hello, {name}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('replaces a placeholder that contains an underscore', () => {
      const template = 'Hello, {name_1}!';
      const mapping = { name_1: 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('replaces a placeholder that starts with a number', () => {
      const template = 'Hello, {1name}!';
      const mapping = { '1name': 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('replaces a placeholder that includes a space', () => {
      const template = 'Hello, {name with space}!';
      const mapping = { 'name with space': 'World' };
      const expected = 'Hello, World!';

      const actual = Interpolator.interpolate(template, mapping);

      expect(actual).toBe(expected);
    });

    it('given a typed mapping without a string index, replaces its placeholders', () => {
      interface Mapping {
        name: string;
      }
      const template = 'Hello, {name}!';
      const mapping: Mapping = { name: 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('given a mapping that omits an optional key of its type, replaces the placeholders that it has', () => {
      interface Mapping {
        required: string;
        notRequired?: string;
      }
      const template = 'Hello, {required}!';
      const mapping: Mapping = { required: 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it.each([
      ['Hello, {name!', 'unmatched opening'],
      ['Hello, name}!', 'unmatched closing'],
      ['Hello, {name{}}!', 'nested'],
    ])('given %j, throws an error reporting the %s delimiter', (badTemplate, fragment) => {
      const mapping = { name: 'World' };
      const throwingFn = () => new Interpolator(badTemplate).interpolate({ mapping });

      expect(throwingFn).toThrow(fragment);
    });

    it('given a Map as mapping, replaces each placeholder with the value of its key', () => {
      const template = '{greeting}, {planet}!';
      const mapping = new Map().set('greeting', 'Hello').set('planet', 'World');
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('given a string array as mapping, replaces each index placeholder with the element at that index', () => {
      const template = '{0}, {1}!';
      const mapping = ['Hello', 'World'];
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('given a regular-expression key, replaces every placeholder that it matches', () => {
      const template = '{hullo}, {hallo}!';
      const mapping = new Map().set(/h.llo/, 'hello');
      const expected = 'hello, hello!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('does not partially match a regular expression', () => {
      const template = '{key}, {key2}!';
      const mapping = new Map().set(/key/, 'value');
      const expected = 'value, {key2}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it("if key is a regex, does not adapt the value to the placeholder's case", () => {
      const template = '{key} {KEY} {Key}';
      const mapping = new Map().set(/key/i, 'value');
      const expected = 'value value value';

      const actual = Interpolator.interpolate(template, mapping);

      expect(actual).toBe(expected);
    });

    it('given a catch-all regular-expression key, replaces each placeholder that no other key matches', () => {
      const template = '{Key1} {key2} {key3}';
      const mapping = new Map<RegExp | string, string>()
        .set('key1', 'value1')
        .set('key2', 'value2')
        .set(/.*/, 'unmatched');
      const expected = 'Value1 value2 unmatched';

      const actual = new Interpolator(template).setMapping(mapping).interpolate();

      expect(actual).toBe(expected);
    });

    it('if the transform can be identified, applies the transform to the value', () => {
      const template = 'Hello, {AUDIENCE}!';
      const mapping = { audience: 'world' };
      const expected = 'Hello, WORLD!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('applies case-transformation individually to each occurrence', () => {
      const template =
        'lowercase {key}, uppercase {KEY}, capitalized {Key}, mixed-case {mixedKey}, unmatched {otherKey}';
      const mapping = { key: 'value', mixedKey: 'value' };
      const expected = 'lowercase value, uppercase VALUE, capitalized Value, mixed-case value, unmatched {otherKey}';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    it('if the transform cannot be identified, leaves the placeholder unchanged', () => {
      const template = '{greeting}, {myPlanet}! This is a {grEeting}!';
      const mapping = { greeting: 'Hello', myPlanet: 'World' };
      const expected = 'Hello, World! This is a {grEeting}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      expect(actual).toBe(expected);
    });

    describe('ifMissing options', () => {
      const template = '{matched} {unmatched1} {UNMATCHED2}';
      const mapping = { matched: 'value' };
      const interpolable = new Interpolator(template).setMapping(mapping);

      it('if ifMissing=THROW and there are unmatched placeholders, throws an error listing the unused placeholders in lower case', () => {
        const ifMissing = 'THROW';

        const throwingFn = () => interpolable.interpolate({ ifMissing });

        // TODO: Inflect the error message to match the number of placeholders
        expect(throwingFn).toThrow(/unmatched placeholders\W+unmatched1\W+unmatched2\b/);
      });

      it('if ifMissing=USE_KEY, replaces any unmatched placeholder with the placeholder itself', () => {
        const ifMissing = 'USE_KEY';
        const expected = 'value unmatched1 UNMATCHED2';

        const actual = interpolable.interpolate({ ifMissing });

        expect(actual).toBe(expected);
      });

      it('if ifMissing is a function, replaces any unmatched placeholder with the result of the function', () => {
        const ifMissing = () => 'FnReturn';
        const expected = 'value FnReturn FnReturn';

        const actual = interpolable.interpolate({ ifMissing });

        expect(actual).toBe(expected);
      });
    });
  });

  describe('stored options', () => {
    type Interpolate = (template: string, mapping: Record<string, string>, options: InterpolatorOptions) => string;

    const entryPoints: Array<[string, Interpolate]> = [
      [
        'constructor',
        (template, mapping, options) => new Interpolator(template, { ...options, mapping }).interpolate(),
      ],
      [
        'setOptions()',
        (template, mapping, options) => new Interpolator(template).setOptions({ ...options, mapping }).interpolate(),
      ],
      ['static interpolate()', (template, mapping, options) => Interpolator.interpolate(template, mapping, options)],
      ['standalone interpolate()', (template, mapping, options) => interpolate(template, mapping, options)],
    ];

    it.each(entryPoints)('applies ifMissing passed to the %s', (_, interpolateWith) => {
      const throwingFn = () => interpolateWith('{a} {b}', { a: 'x' }, { ifMissing: 'THROW' });

      expect(throwingFn).toThrow(/unmatched placeholders\W+b\b/);
    });

    it.each(entryPoints)('applies noAdaptCase passed to the %s', (_, interpolateWith) => {
      const actual = interpolateWith('{Name}', { name: 'bob' }, { noAdaptCase: true });

      expect(actual).toBe('bob');
    });

    it('if interpolate() is passed ifMissing, uses it in place of the stored one', () => {
      const interpolable = new Interpolator('{a} {b}', { mapping: { a: 'x' }, ifMissing: 'THROW' });

      const actual = interpolable.interpolate({ ifMissing: 'USE_KEY' });

      expect(actual).toBe('x b');
    });

    it('if interpolate() is passed noAdaptCase, uses it in place of the stored one', () => {
      const interpolable = new Interpolator('{Name}', { mapping: { name: 'bob' }, noAdaptCase: true });

      const actual = interpolable.interpolate({ noAdaptCase: false });

      expect(actual).toBe('Bob');
    });

    it('if interpolate() is passed undefined options, keeps the stored ones', () => {
      const throwing = new Interpolator('{a} {b}', { mapping: { a: 'x' }, ifMissing: 'THROW' });
      const preserving = new Interpolator('{Name}', { mapping: { name: 'bob' }, noAdaptCase: true });

      const throwingFn = () => throwing.interpolate({ ifMissing: undefined });
      const actual = preserving.interpolate({ noAdaptCase: undefined });

      expect(throwingFn).toThrow(/unmatched placeholders\W+b\b/);
      expect(actual).toBe('bob');
    });
  });

  describe('setOptions()', () => {
    const template = 'Hello, {name}';
    const interpolable = new Interpolator(template);

    it.each([new Map().set('0', 'World'), { 0: 'World' }, ['World']])(
      'optionally stores ifMissing, mapping, and noAdaptCase in the instance',
      (mapping) => {
        const options = {
          ifMissing: 'THROW',
          mapping,
          noAdaptCase: true,
        } as const;
        const expected = {
          ifMissing: 'THROW',
          mapping: new Map().set('0', 'World'),
          noAdaptCase: true,
          template: 'Hello, {name}',
        };

        const actual = interpolable.setOptions(options);

        expect(toObjectLiteral(actual)).toStrictEqual(expected);
      },
    );

    it('if mapping has duplicate keys when case is ignored, throws an error', () => {
      const mapping = { KEY: 'value', key: 'value' };

      const throwingFn = () => interpolable.setOptions({ mapping });

      expect(throwingFn).toThrow('unique');
    });
  });

  describe('validate()', () => {
    it('if the template contains nested braces, returns failure', () => {
      const template = 'Hello, {name{foo}}';
      const expected = {
        isValid: false,
        errors: [{ code: 'NESTED_DELIMITERS', message: 'Text has nested delimiters.' }],
      };

      const actual = Interpolator.validateTemplate(template);

      expect(toObjectLiteral(actual)).toStrictEqual(expected);
    });

    it('if the template contains mismatched braces, returns failure', () => {
      const template = 'Hello, {name}{';
      const expected = {
        isValid: false,
        errors: [{ code: 'UNMATCHED_OPENING_DELIMITER', message: 'Text has unmatched opening brace.' }],
      };

      const actual = Interpolator.validateTemplate(template);

      expect(toObjectLiteral(actual)).toStrictEqual(expected);
    });
  });
});

/** Converts nested objects to plain object literals, leaving arrays and maps as they are. */
function toObjectLiteral(value: unknown): unknown {
  if (is.array(value) || is.map(value)) {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toObjectLiteral(v)]));
  }
  return value;
}
