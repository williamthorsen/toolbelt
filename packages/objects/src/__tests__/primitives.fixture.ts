import type { Scalar } from '../isScalar.js';

export const nonscalars = [
  ['an object literal', { a: 1 }],
  ['an array', [1, 2, 3]],
  ['a built-in class instance', new Date()],
] satisfies [label: string, value: object][];

export const scalars = [undefined, 1, 'a', true, 1n, Symbol('a')].map((value) => [
  `a value of type ${typeof value}`,
  value,
]) satisfies [label: string, value: Scalar][];
