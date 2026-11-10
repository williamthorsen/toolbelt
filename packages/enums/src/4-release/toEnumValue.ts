import { type EnumValue, isEnumValue } from './isEnumValue.ts';

/**
 * Returns the enum value if it is a member of the provided enum, else undefined.
 *
 * @category Enum
 * @stage release
 */
export function toEnumValue<TEnum extends Record<string, EnumValue>>(
  enumObject: TEnum,
  value: unknown,
): TEnum[keyof TEnum] | undefined {
  return isEnumValue(enumObject, value) ? value : undefined;
}
