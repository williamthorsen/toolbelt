/**
 * Returns true if the key belongs to an entry that a numeric enum's reverse mapping adds, which maps the string form of
 * a member's value back to the member's name.
 *
 * @internal
 */
export function isReverseMappingKey(enumObject: Readonly<Record<string, number | string>>, key: string): boolean {
  const memberName = enumObject[key];
  if (typeof memberName !== 'string') return false;

  const forwardValue = enumObject[memberName];
  return typeof forwardValue === 'number' && String(forwardValue) === key;
}
