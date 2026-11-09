export interface AdoptedExportsDiff {
  callable: string[];
  omitted: string[];
  unexported: string[];
}

/**
 * Compares a package's published tier namespaces with the list of exports against which its adoption is counted.
 * A listed name matches an export of any value type, while only a function-valued export counts as callable.
 * Names keep tier order, then the order in which each namespace enumerates them.
 */
export function diffAdoptedExports(tiers: readonly object[], adopted: readonly string[]): AdoptedExportsDiff {
  const entries = tiers.flatMap((tier) => Object.entries(tier));
  const callable = entries.filter(([, value]) => typeof value === 'function').map(([name]) => name);
  const exported = new Set(entries.map(([name]) => name));

  return {
    callable,
    omitted: callable.filter((name) => !adopted.includes(name)),
    unexported: adopted.filter((name) => !exported.has(name)),
  };
}
