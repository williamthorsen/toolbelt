import { type EnumValue, type EnumValueType, isEnumValue } from './isEnumValue.ts';

/**
 * Returns the enum value if it is a member of the provided enum, else undefined.
 */
export function toEnumValue<TEnum extends Record<string, EnumValue>>(
  enumObject: TEnum,
  value: EnumValueType<TEnum> | null | undefined,
): TEnum[keyof TEnum] | undefined {
  return isEnumValue(enumObject, value) ? value : undefined;
}
