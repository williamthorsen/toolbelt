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
 * Nothing in the anchor is a string literal, so this scans the blanked code directly, where `listExitMocks`
 * and `listConsoleSites` have to match the source and read their verdict off the blanked text at equal
 * offsets.
 *
 * The anchor is case-sensitive, which is what holds `disposeOnTestFinished` outside it, so an adopting
 * project's own calls are not reported. `\b` matches after a `.` as readily as at a line start, so the
 * test-context form `ctx.onTestFinished` is an anchor too.
 *
 * Everything else the anchor covers yields no site at all, where the other two detectors report an
 * `unclassified` one. Their anchors are the idiom, so a mock they cannot read is still a site; this one merely
 * hosts the idiom, and a cleanup hook disposing nothing would otherwise enter the denominator every check in
 * the kit shares. Requiring the disposal's own call parentheses declines three cases at once: a callback given
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
