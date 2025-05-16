import type { Scalar } from '../3-candidate/isScalar.ts';

export const nonscalars = [
  { label: 'an object literal', value: { a: 1 } },
  { label: 'an array', value: [1, 2, 3] },
  { label: 'a built-in class instance', value: new Date() },
] satisfies { label: string; value: object }[];

export const serializableScalars = [undefined, 1, 'a', true].map(labelScalar);

const unserializableScalars = [1n, Symbol('a')].map(labelScalar);

export const scalars = [...serializableScalars, ...unserializableScalars];

function labelScalar<T extends Scalar>(value: T): { label: string; value: T } {
  return {
    label: `a value of type ${typeof value}`,
    value,
  };
}
