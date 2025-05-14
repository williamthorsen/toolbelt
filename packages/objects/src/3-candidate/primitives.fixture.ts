import type { Scalar } from './isScalar.ts';

export const nonscalars = [
  { label: 'an object literal', value: { a: 1 } },
  { label: 'an array', value: [1, 2, 3] },
  { label: 'a built-in class instance', value: new Date() },
] satisfies { label: string; value: object }[];

export const scalars = [undefined, 1, 'a', true, 1n, Symbol('a')].map((value) => ({
  label: `a value of type ${typeof value}`,
  value,
})) satisfies { label: string; value: Scalar }[];
