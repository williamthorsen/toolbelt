import { describe, expect, it } from 'vitest';

import { TextNode, VariantNode } from '../TextNode.ts';
import { nestedTextNodeAst } from './fixtures/TextNode.fixture.ts';

describe(TextNode, () => {
  const testCase = {
    input: '1:[A[1[a|b]|2[c|d]]|B] | 2:[C|D[1|2][a|b]|E]',
    output: '1:A2c | 2:D1b',
    fingerprint: '0[1[0]]|1[0|1]:1236',
    seed: 1236,
    encodedIndices: '0[1[0]]|1[0|1]',
    flatIndices: [0, 1, 0, 1, 0, 1],
    nestedIndices: [
      [0, [1, [0]]],
      [1, [0, 1]],
    ],
  };

  describe('static create()', () => {
    it('if given a simple phrase, returns a single TextNode', () => {
      const input = 'Hello';
      const expected = {
        content: 'Hello',
        children: undefined,
      };

      const actual = TextNode.create(input);

      expect(actual).toMatchObject(expected);
    });

    it('if given a delimited phrase, splits it into variants', () => {
      const input = '[A|B|C]';
      const expected = {
        content: input,
        variants: ['A', 'B', 'C'],
      };

      const actual = TextNode.create(input);

      expect(actual).toMatchObject(expected);
    });

    it('given a string containing delimited phrases, splits it into tokens and variants', () => {
      const input = 'static [A|B] more static [C|D]';
      const expected = {
        content: input,
        children: [
          'static ',
          {
            content: '[A|B]',
            variants: ['A', 'B'],
          },
          ' more static ',
          {
            content: '[C|D]',
            variants: ['C', 'D'],
          },
        ],
      };

      const actual = TextNode.create(input);

      expect(actual).toMatchObject(expected);
    });

    it('given nested delimiters, builds nested variant nodes', () => {
      const input = '1:[A[1[a|b]|2[c|d]]|B] 2:[C|D]';
      const expected = nestedTextNodeAst;

      const actual = TextNode.create(input);

      expect(actual).toMatchObject(expected);
    });
  });

  describe('static decodeIndices()', () => {
    it('given encoded indices, splits on non-numeric sequences and returns an array of numbers', () => {
      const input = testCase.encodedIndices;
      const expected = testCase.flatIndices;

      const actual = TextNode.decodeIndices(input);

      expect(actual).toStrictEqual(expected);
    });

    it('given a fingerprint, strips the seed and decodes the indices', () => {
      const fingerprint = '0[1]]:1236';
      const expected = TextNode.decodeIndices('0[1]]');

      const actual = TextNode.decodeIndices(fingerprint);

      expect(actual).toStrictEqual(expected);
    });

    it('flattens nested arrays', () => {
      const input = testCase.nestedIndices;
      const expected = testCase.flatIndices;

      const actual = TextNode.decodeIndices(input);

      expect(actual).toStrictEqual(expected);
    });

    describe('static encodeIndices()', () => {
      it('transforms an arbitrarily nested array of numbers into a fingerprint', () => {
        const input = testCase.nestedIndices;
        const expected = testCase.encodedIndices;

        const actual = VariantNode.encodeIndices(input);

        expect(actual).toBe(expected);

        // Verify that the encoded string is equivalent to the input string
        expect(TextNode.decodeIndices(actual)).toStrictEqual(TextNode.decodeIndices(input));
      });
    });
  });

  describe('pick()', () => {
    it('reconstructs static content', () => {
      const input = 'Hello, world!';
      const expected = input;

      const actual = TextNode.create(input).pick();

      expect(actual).toBe(expected);
    });

    it('randomly resolves variants', () => {
      const input = '[A|B|C]';
      const expected = /^[ABC]$/;

      const actual = TextNode.create(input).pick();

      expect(actual).toMatch(expected);
    });
  });

  describe('pickIndices', () => {
    it('selects depth-first indices to resolve variants', () => {
      const { input, seed } = testCase;

      const node1 = TextNode.create(input);
      const actualString = node1.pick({ seed });

      const node2 = TextNode.create(input);
      const actualIndices = node2.pickIndices({ seed });

      expect(actualString).toBe(testCase.output);
      expect(actualIndices).toStrictEqual(testCase.nestedIndices);
    });

    it('given a node without children, returns an empty array', () => {
      const input = 'Hello';
      const expected: number[] = [];

      const actual = TextNode.create(input).pickIndices();

      expect(actual).toStrictEqual(expected);
    });
  });

  describe('pickWithFingerprint()', () => {
    it('returns an object containing the picked content and fingerprint', () => {
      const { input, output, encodedIndices, nestedIndices, seed } = testCase;
      const textNode = TextNode.create(input);
      const expected = {
        content: output,
        encodedIndices,
        fingerprint: `${encodedIndices}:${seed}`,
        indices: nestedIndices,
        seed,
      };

      const actual = textNode.pickWithFingerprint({ seed });

      expect(actual).toStrictEqual(expected);
    });

    it('given a text whose picked indices are flat, returns the indices and their encoding', () => {
      const textNode = TextNode.create('[A|B|C]');

      const { content, encodedIndices, fingerprint, indices, seed } = textNode.pickWithFingerprint({ seed: 1 });

      expect(indices).toHaveLength(1);
      expect(encodedIndices).toBe(TextNode.encodeIndices(indices));
      expect(encodedIndices).not.toBe('');
      expect(fingerprint).toBe(`${encodedIndices}:${seed}`);
      expect(textNode.selectVariants(encodedIndices)).toBe(content);
    });

    it('given no seed, generates an integer seed and returns a new one', () => {
      const textNode = TextNode.create(testCase.input);

      const { seed } = textNode.pickWithFingerprint();

      expect(Number.isSafeInteger(seed)).toBe(true);
    });

    it('given a non-integer seed, generates a deterministic integer from it and returns it', () => {
      const inputSeed = 0.1234;
      const textNode = TextNode.create(testCase.input);

      const outputSeed = textNode.pickWithFingerprint({ seed: inputSeed }).seed;
      const outputSeed2 = textNode.pickWithFingerprint({ seed: inputSeed }).seed;

      expect(outputSeed).not.toBe(inputSeed);
      expect(outputSeed).toBe(outputSeed2);
      expect(Number.isSafeInteger(outputSeed)).toBe(true);
    });
  });

  describe('selectVariants()', () => {
    it('consumes indices to select variants depth-first', () => {
      const textNode = TextNode.create(testCase.input);
      const expected = textNode.pick({ seed: testCase.seed });

      expect(expected).toBe(testCase.output);

      const actualFromIndices = textNode.selectVariants(testCase.flatIndices);
      const actualFromNestedIndices = textNode.selectVariants(testCase.nestedIndices);
      const actualFromEncoding = textNode.selectVariants(testCase.encodedIndices);

      expect(actualFromIndices).toBe(testCase.output);
      expect(actualFromNestedIndices).toBe(testCase.output);
      expect(actualFromEncoding).toBe(testCase.output);
    });

    it('given a top-level VariantNode, resolves the selected variant and its nested variant', () => {
      const input = '[A|B[1|2]|C]';
      const indices = '1[0]';
      const ast = TextNode.create(input);
      const expected = 'B1';

      const actual = ast.selectVariants(indices);

      expect(actual).toBe(expected);
    });

    it('given a VariantNode, resolves encoded indices', () => {
      const node = new VariantNode('[A|B[1|2]|C]');

      const actual = node.selectVariants('1[0]');

      expect(actual).toBe('B1');
    });

    it('given a text without children, returns an empty string', () => {
      const input = '';
      const expected = '';

      const actual = TextNode.create(input).selectVariants([]);

      expect(actual).toBe(expected);
    });

    it('given an invalid index, throws an error', () => {
      const input = '[A|B|C]';
      const indices = [3];
      const ast = TextNode.create(input);

      const throwingFn = () => ast.selectVariants(indices);

      expect(throwingFn).toThrow(RangeError);
      expect(throwingFn).toThrow('exceeds maximum');
      expect(indices).toStrictEqual([3]);
    });

    it.each(['[A|B[1|2]|C]', 'x [A|B] [C|D]'])('given flat indices, leaves the array unchanged (%s)', (input) => {
      const indices = [1, 0];
      const ast = TextNode.create(input);

      const first = ast.selectVariants(indices);
      const second = ast.selectVariants(indices);

      expect(second).toBe(first);
      expect(indices).toStrictEqual([1, 0]);
    });

    it('given too few indices to resolve all variants, throws an error', () => {
      const input = '[A[1|2]|B[3|4]|C[5|6]]'; // needs 2 indices to resolve
      const indices = [0];
      const ast = TextNode.create(input);

      const throwingFn = () => ast.selectVariants(indices);

      expect(throwingFn).toThrow('Not enough indices');
    });

    it('given too many indices, throws an error', () => {
      const input = '[A|B|C]';
      const indices = [1, 1];
      const ast = TextNode.create(input);

      const throwingFn = () => ast.selectVariants(indices);

      expect(throwingFn).toThrow('Unused variant indices. Received 2, leaving 1 unused.');
    });
  });

  describe('toString()', () => {
    it('reconstructs the original content', () => {
      const input = 'token1 [A[1[a|b]|2[c|d]]|B] token2 [C|D]';
      const expected = input;

      const actual = TextNode.create(input).toString();

      expect(actual).toBe(expected);
    });

    it('given a text without children, returns an empty string', () => {
      const input = '';
      const expected = '';

      const actual = TextNode.create(input).toString();

      expect(actual).toBe(expected);
    });
  });
});
