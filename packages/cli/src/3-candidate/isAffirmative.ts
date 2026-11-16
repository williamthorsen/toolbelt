/**
 * Reports whether an answer confirms: `y` or `yes` in any case, ignoring surrounding whitespace.
 *
 * @category CLI
 * @stage candidate
 */
export function isAffirmative(answer: string | undefined): boolean {
  const normalized = answer?.trim().toLowerCase();
  return normalized === 'y' || normalized === 'yes';
}
