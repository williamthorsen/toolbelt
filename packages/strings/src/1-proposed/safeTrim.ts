export function safeTrim(value: string): string;
export function safeTrim<T>(value: T): T;
export function safeTrim<T>(value: string | T): T | string {
  return typeof value === 'string' ? value.trim() : value;
}
