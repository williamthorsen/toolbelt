import { assertEquals, assertObjectMatch, assertThrows, describe, it } from '../../dev_deps.ts';
import { interpolate, Interpolator } from '../Interpolator.ts';

describe(Interpolator, () => {
  describe('static interpolate() & standalone interpolate()', () => {
    it('can be called without creating an instance', () => {
      const template = '{Salutation} {TITLE} {unmatched} {}';
      const mapping = { salutation: 'dear', title: 'sir' };
      const expected = 'Dear SIR {unmatched} {}';

      const staticActual = Interpolator.interpolate(template, mapping);
      const fnActual = interpolate(template, mapping);

      assertEquals(staticActual, expected);
      assertEquals(fnActual, expected);
    });
  });

  describe('getKeys()', () => {
    const template = 'not used in this test';

    it('if the mapping contains no keys, returns an empty set', () => {
      const mapping = {};
      const interpolable = new Interpolator(template);
      const expected = new Set();

      const actual = interpolable.getKeys({ mapping });

      assertEquals(actual, expected);
    });

    it('if the mapping contains entries, returns a unique array of their keys in lower case', () => {
      const mapping = { firstName: 'John', lastName: 'Doe' };
      const interpolable = new Interpolator(template).setOptions({ mapping });
      const expected = new Set(['firstname', 'lastname']);

      const actual = interpolable.getKeys();

      assertEquals(actual, expected);
    });
  });

  describe('getPlaceholders()', () => {
    it('if the template contains no placeholders, returns an empty array', () => {
      const template = 'Hello, World!';
      const interpolable = new Interpolator(template);
      const expected = new Set();

      const actual = interpolable.getPlaceholders();

      assertEquals(actual, expected);
    });

    it('if the template contains placeholders, returns a unique array of them in lower case', () => {
      const template = 'To {firstName} {lastName}! Hello, {firstName}!';
      const interpolable = new Interpolator(template);
      const expected = new Set(['firstname', 'lastname']);

      const actual = interpolable.getPlaceholders();

      assertEquals(actual, expected);
    });
  });

  describe('getSets()', () => {
    it('correctly identifies matched & unmatched keys and placeholders', () => {
      const template = '{match1}{templateOnly}{match2}';
      const interpolable = new Interpolator(template);
      const mapping = { mappingOnly: 'value', match1: 'value', match2: 'value' };
      const expected = {
        matches: new Set(['match1', 'match2']),
        unmatchedKeys: new Set(['mappingonly']),
        unmatchedPlaceholders: new Set(['templateonly']),
      };

      const actual = interpolable.getSets({ mapping });

      assertEquals(actual, expected);
    });
  });

  describe('interpolate()', () => {
    it('when a placeholder matches a key in the mapping, replaces the placeholder with the corresponding value', () => {
      const template = 'Hello, {name}!';
      const mapping = { name: 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('when a placeholder does not match any key in the mapping, leaves the placeholder unchanged', () => {
      const template = 'Hello, {name}!';
      const mapping = { greeting: 'Hi' };
      const expected = 'Hello, {name}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('when multiple occurrences of a placeholder match a key in the mapping, replaces all occurrences with the corresponding value', () => {
      const template = '{delimiter}Hello, {name}!{delimiter}';
      const mapping = { name: 'World', delimiter: '|' };
      const expected = '|Hello, World!|';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('when a placeholder is empty, leaves the placeholder unchanged', () => {
      const template = 'Hello, {}!';
      const mapping = { name: 'World' };
      const expected = 'Hello, {}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('when the template is an empty string, returns an empty string', () => {
      const template = '';
      const mapping = { name: 'World' };
      const expected = '';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('when the mapping is empty, leaves all placeholders unchanged', () => {
      const template = 'Hello, {name}!';
      const mapping = {};
      const expected = 'Hello, {name}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('accepts placeholders containing underscores', () => {
      const template = 'Hello, {name_1}!';
      const mapping = { name_1: 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('allows placeholders that start with a number', () => {
      const template = 'Hello, {1name}!';
      const mapping = { '1name': 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('allows placeholders that include a space', () => {
      const template = 'Hello, {name with space}!';
      const mapping = { 'name with space': 'World' };
      const expected = 'Hello, World!';

      const actual = Interpolator.interpolate(template, mapping);

      assertEquals(actual, expected);
    });

    it('works with a typed object not having a string index', () => {
      interface Mapping {
        name: string;
      }
      const template = 'Hello, {name}!';
      const mapping: Mapping = { name: 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('works with a mapping that is missing keys that are optional in its type', () => {
      interface Mapping {
        required: string;
        notRequired?: string;
      }
      const template = 'Hello, {required}!';
      const mapping: Mapping = { required: 'World' };
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    for (const badTemplate of ['Hello, {name!', 'Hello, name}!', 'Hello, {name{}}!']) {
      it('if delimiters are mismatched or nested, throws an error', () => {
        const mapping = { name: 'World' };
        const throwingFn = () => new Interpolator(badTemplate).interpolate({ mapping });

        assertThrows(throwingFn, Error, 'Text has');
      });
    }

    it('accepts a Map as mapping', () => {
      const template = '{greeting}, {planet}!';
      const mapping = new Map().set('greeting', 'Hello').set('planet', 'World');
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('accepts a string array as mapping', () => {
      const template = '{0}, {1}!';
      const mapping = ['Hello', 'World'];
      const expected = 'Hello, World!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('accepts a regular expression', () => {
      const template = '{hullo}, {hallo}!';
      const mapping = new Map().set(/h.llo/, 'hello');
      const expected = 'hello, hello!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('does not partially match a regular expression', () => {
      const template = '{key}, {key2}!';
      const mapping = new Map().set(/key/, 'value');
      const expected = 'value, {key2}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it("if key is a regex, does not adapt the value to the placeholder's case", () => {
      const template = '{key} {KEY} {Key}';
      const mapping = new Map().set(/key/i, 'value');
      const expected = 'value value value';

      const actual = Interpolator.interpolate(template, mapping);

      assertEquals(actual, expected);
    });

    it('can use a catch-all to replace unmatched delimiters', () => {
      const template = '{Key1} {key2} {key3}';
      const mapping = new Map<RegExp | string, string>()
        .set('key1', 'value1')
        .set('key2', 'value2')
        .set(/.*/, 'unmatched');
      const expected = 'Value1 value2 unmatched';

      const actual = new Interpolator(template).setMapping(mapping).interpolate();

      assertEquals(actual, expected);
    });

    it('if the transform can be identified, applies the transform to the value', () => {
      const template = 'Hello, {AUDIENCE}!';
      const mapping = { audience: 'world' };
      const expected = 'Hello, WORLD!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('applies case-transformation individually to each occurrence', () => {
      const template =
        'lowercase {key}, uppercase {KEY}, capitalized {Key}, mixed-case {mixedKey}, unmatched {otherKey}';
      const mapping = { key: 'value', mixedKey: 'value' };
      const expected = 'lowercase value, uppercase VALUE, capitalized Value, mixed-case value, unmatched {otherKey}';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    it('if the transform cannot be identified, leaves the placeholder unchanged', () => {
      const template = '{greeting}, {myPlanet}! This is a {grEeting}!';
      const mapping = { greeting: 'Hello', myPlanet: 'World' };
      const expected = 'Hello, World! This is a {grEeting}!';

      const actual = new Interpolator(template).interpolate({ mapping });

      assertEquals(actual, expected);
    });

    describe('ifMissing options', () => {
      const template = '{matched} {unmatched1} {UNMATCHED2}';
      const mapping = { matched: 'value' };
      const interpolable = new Interpolator(template).setMapping(mapping);

      it('if ifMissing=THROW and there are unmatched placeholders, throws  error listing the unused placeholders in lower case', () => {
        const ifMissing = 'THROW';

        const throwingFn = () => interpolable.interpolate({ ifMissing });

        // TODO: Inflect the error message to match the number of placeholders
        assertThrows(throwingFn, Error, 'Text has unmatched placeholders: unmatched1, unmatched2');
      });

      it('if ifMissing=USE_KEY, replaces any unmatched placeholder with the placeholder itself', () => {
        const ifMissing = 'USE_KEY';
        const expected = 'value unmatched1 UNMATCHED2';

        const actual = interpolable.interpolate({ ifMissing });

        assertEquals(actual, expected);
      });

      it('if ifMissing is a function, replaces any unmatched placeholder with the result of the function', () => {
        const ifMissing = () => 'FnReturn';
        const expected = 'value FnReturn FnReturn';

        const actual = interpolable.interpolate({ ifMissing });

        assertEquals(actual, expected);
      });
    });
  });

  describe('setOptions()', () => {
    const template = 'Hello, {name}';
    const interpolable = new Interpolator(template);
    for (const mapping of [new Map().set('0', 'World'), { 0: 'World' }, ['World']]) {
      it('optionally stores ifMissing, mapping, and noAdaptCase in the instance', () => {
        const options = {
          ifMissing: 'THROW',
          mapping,
          noAdaptCase: true,
        } as const;
        const expected = {
          ifMissing: 'THROW',
          mapping: new Map().set('0', 'World'),
          noAdaptCase: true,
        };

        const actual = interpolable.setOptions(options);

        assertObjectMatch(actual, expected);
      });
    }

    it('if mapping has duplicate keys when case is ignored, throws an error', () => {
      const mapping = { KEY: 'value', key: 'value' };

      const throwingFn = () => interpolable.setOptions({ mapping });

      assertThrows(throwingFn, Error, 'Mapping keys must be unique, ignoring case.');
    });
  });

  describe('validate()', () => {
    it('if the template contains nested braces, returns failure', () => {
      const template = 'Hello, {name{foo}}';
      const expected = {
        isValid: false,
        errors: [{ code: 'NESTED_DELIMITERS' }],
      };

      const actual = Interpolator.validateTemplate(template);

      assertObjectMatch(actual, expected);
    });

    it('if the template contains mismatched braces, returns failure', () => {
      const template = 'Hello, {name}{';
      const expected = {
        isValid: false,
        errors: [{ code: 'UNMATCHED_OPENING_DELIMITER' }],
      };

      const actual = Interpolator.validateTemplate(template);

      assertObjectMatch(actual, expected);
    });
  });
});
