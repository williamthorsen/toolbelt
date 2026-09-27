import { blankNonCode, getLineAtOffset, PARENTHESES, readBalancedGroup } from '@williamthorsen/toolbelt.adoption';

export interface DisposalHook {
  kind: DisposalHookKind;
  line: number;
}

export type DisposalHookKind = 'disposal-hook';

const HOOK = /\bonTestFinished\s*\(/g;
const DISPOSAL = /\[\s*Symbol\s*\.\s*dispose\s*\]\s*\(/;

/**
 * Lists every `onTestFinished` call whose callback disposes a value.
 *
 * Nothing in the anchor is a string literal, so this scans the blanked code directly.
 *
 * The anchor is case-sensitive, which keeps an adopting project's own `disposeOnTestFinished` calls outside
 * it. Because `\b` matches after a `.` as readily as at a line start, the test-context form
 * `ctx.onTestFinished` is an anchor too.
 *
 * Everything else the anchor covers yields no site at all, whereas the other two detectors report an
 * `unclassified` one. Their anchors are the idiom, so a mock that they cannot read is still a site; this one merely
 * contains the idiom, and reporting a cleanup hook that disposes nothing would add it to the denominator shared by
 * every check in the kit. Requiring the disposal's own call parentheses declines three cases at once: a callback given
 * as a bare reference, an unbound `resource[Symbol.dispose]` handed straight to the hook, and
 * `Symbol.asyncDispose`, which the package publishes no overload for.
 *
 * @internal
 */
export function listDisposalHooks(source: string): DisposalHook[] {
  const code = blankNonCode(source);
  const hooks: DisposalHook[] = [];

  for (const match of code.matchAll(HOOK)) {
    const group = readBalancedGroup(code, match.index, PARENTHESES);
    if (group === undefined) continue;

    if (!DISPOSAL.test(code.slice(group.start + 1, group.end - 1))) continue;

    hooks.push({ kind: 'disposal-hook', line: getLineAtOffset(code, match.index) });
  }

  return hooks;
}
