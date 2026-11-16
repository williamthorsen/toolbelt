import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { listExportedTierDirectories } from '../test-utils/listExportedTierDirectories.ts';
import { listSourceFiles } from '../test-utils/listSourceFiles.ts';
import { SCAFFOLDING_DIRS } from '../test-utils/scaffolding-dirs.ts';

describe('Unindexed tier exports', () => {
  it('every exported function or class that no tier index re-exports is tagged @internal and neither @category nor @stage', () => {
    const { checkedCount, mistaggedExports } = auditUnindexedExports(findMonorepoRoot());

    expect(mistaggedExports).toStrictEqual([]);
    // Guard against a vacuous pass: A broken walk would report no mistagged exports either.
    expect(checkedCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every exported function and class in a package's exported maturity tiers that none of its tier indexes
 * re-exports, reporting each one that lacks `@internal` or declares `@category` or `@stage`. Such an export is
 * published by no subpath, so it has no maturity to declare.
 */
function auditUnindexedExports(monorepoRoot: string): { checkedCount: number; mistaggedExports: string[] } {
  const mistaggedExports: string[] = [];
  let checkedCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    const tierDirectories = listExportedTierDirectories(packageDirectory);
    if (tierDirectories.length === 0) continue;

    const indexFiles = tierDirectories.map((tierDirectory) => path.join(tierDirectory, 'index.ts'));
    const sourceFiles = tierDirectories.flatMap((tierDirectory) => [
      ...listSourceFiles(tierDirectory, SCAFFOLDING_DIRS),
    ]);
    // Load only the tier sources: Export symbols resolve without the standard library or another package's types.
    const program = ts.createProgram(sourceFiles, {
      allowImportingTsExtensions: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      noLib: true,
      noResolve: true,
      types: [],
    });
    const checker = program.getTypeChecker();

    const indexedSymbols = new Set(
      indexFiles.flatMap((indexFile) => listModuleExports(checker, program.getSourceFile(indexFile))),
    );

    for (const sourceFile of sourceFiles) {
      const sourceFileNode = program.getSourceFile(sourceFile);

      for (const symbol of listModuleExports(checker, sourceFileNode)) {
        const declaration = symbol.declarations?.[0];
        if (declaration === undefined || declaration.getSourceFile() !== sourceFileNode) continue;
        if (!ts.isFunctionDeclaration(declaration) && !ts.isClassDeclaration(declaration)) continue;
        if (indexedSymbols.has(symbol)) continue;

        checkedCount += 1;

        const tagNames = new Set(ts.getJSDocTags(declaration).map((tag) => tag.tagName.text));
        if (!tagNames.has('internal') || tagNames.has('category') || tagNames.has('stage')) {
          mistaggedExports.push(`${path.relative(monorepoRoot, sourceFile)}: ${symbol.name}`);
        }
      }
    }
  }

  return { checkedCount, mistaggedExports: mistaggedExports.toSorted((a, b) => a.localeCompare(b)) };
}

/** Lists the symbols that a module exports, each re-export resolved to the symbol that it names. */
function listModuleExports(checker: ts.TypeChecker, sourceFile: ts.SourceFile | undefined): ts.Symbol[] {
  const moduleSymbol = sourceFile === undefined ? undefined : checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol === undefined) return [];

  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol) => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol));
}

// endregion | Helpers
