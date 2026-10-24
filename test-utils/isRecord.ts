/** Reports whether a value is a non-array object whose properties can be read by name. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  // rdy-ignore-next-line toolbelt.objects/no-hand-rolled-record-guard -- root imports no workspace package
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
