import { includes } from '@williamthorsen/toolbelt.arrays/candidate';

import { isReverseMappingKey } from '../internal/isReverseMappingKey.ts';

/**
 * Returns true if the value is a member of the provided enum. Narrows the type.
 *
 * @category Enum
 * @stage release
 */
export function isEnumValue<TEnum extends Record<string, TValue>, TValue extends EnumValue>(
  enumObject: TEnum,
  value: EnumValueType<TEnum> | null | undefined,
): value is Extract<TEnum[keyof TEnum], EnumValueType<TEnum>> {
  const memberValues = Object.entries(enumObject)
    .filter(([key]) => !isReverseMappingKey(key))
    .map(([, memberValue]) => memberValue);
  return includes(memberValues, value);
}

export type EnumValue = number | string;

/**
 * Extracts the type of an enum's values (string or number).
 */
export type EnumValueType<TEnum extends Record<string, EnumValue>> =
  TEnum extends Record<string, string> ? string : number;
