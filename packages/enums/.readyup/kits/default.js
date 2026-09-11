/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.35.1";


// ../adoption/src/conventions/path-predicates.ts
var BIN_DIRECTORY = /(?:^|\/)bin\//;
var JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
var TEST_DIRECTORY = /(?:^|\/)__tests__\//;
var TEST_SUFFIX = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
function isAdoptableSource(path) {
  return isJsTsSource(path) && !isBinWrapper(path) && !isTestFile(path) && !isInTestDirectory(path);
}
function isBinWrapper(path) {
  return BIN_DIRECTORY.test(path);
}
function isInTestDirectory(path) {
  return TEST_DIRECTORY.test(path);
}
function isJsTsSource(path) {
  return JS_TS_EXTENSION.test(path);
}
function isTestFile(path) {
  return TEST_SUFFIX.test(path);
}

// ../adoption/src/kits/defineAdoptionKit.ts
import { defineRdyKit } from "readyup";
import {
  buildFindingReport,
  countPackageUsage,
  readTrackedSources
} from "readyup/check-utils";
var NOT_A_REPO = "the project is not a git working tree, and these checks read the files that git tracks";
var NOTHING_TO_REPORT = { findings: [] };
function defineAdoptionKit(spec) {
  assertCheckIdsAreUnique();
  const cache = {};
  const adoptedPackage = { exportNames: spec.exportNames, packageName: spec.packageName };
  return defineRdyKit({
    description: spec.description,
    defaultSeverity: "warn",
    checklists: [
      {
        name: "adoption",
        checks: spec.checks.map((check) => ({
          name: check.name,
          id: check.id,
          ...check.severity !== void 0 && { severity: check.severity },
          skip: skipUnlessProjectHoldsSources,
          check: () => reportKinds(check.kinds),
          fix: check.fix
        }))
      }
    ]
  });
  function assertCheckIdsAreUnique() {
    const seen = /* @__PURE__ */ new Set();
    const duplicated = /* @__PURE__ */ new Set();
    for (const { id } of spec.checks) {
      if (seen.has(id)) duplicated.add(id);
      seen.add(id);
    }
    if (duplicated.size > 0) {
      const ids = [...duplicated].toSorted().join(", ");
      throw new Error(`${spec.packageName}'s kit gives one id to more than one check: ${ids}`);
    }
  }
  function loadSummary() {
    cache.summary ??= readProject();
    return cache.summary;
  }
  async function readProject() {
    const sources = await readTrackedSources(spec.pathFilter);
    if (sources === void 0) return void 0;
    return {
      adoptedCount: countPackageUsage(sources, adoptedPackage),
      findings: sources.flatMap((source) => spec.detect(source.text).map((site) => ({ ...site, path: source.path }))),
      sources
    };
  }
  async function reportKinds(kinds) {
    const summary = await loadSummary();
    if (summary === void 0) return NOTHING_TO_REPORT;
    return buildFindingReport({
      adoptedCount: summary.adoptedCount,
      findings: summary.findings,
      ownImplementation: { ...adoptedPackage, sources: summary.sources },
      shouldReport: (finding) => kinds.includes(finding.kind)
    });
  }
  async function skipUnlessProjectHoldsSources() {
    const summary = await loadSummary();
    if (summary === void 0) return NOT_A_REPO;
    return summary.sources.length === 0 ? spec.noSourcesReason : false;
  }
}

// ../adoption/src/portable/readBalancedGroup.ts
var PARENTHESES = { close: ")", open: "(" };
function readBalancedGroup(source, from, delimiters) {
  const start = source.indexOf(delimiters.open, from);
  if (start === -1) return void 0;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === delimiters.open) depth += 1;
    else if (source[index] === delimiters.close) {
      depth -= 1;
      if (depth === 0) return { end: index + 1, start };
    }
  }
  return void 0;
}

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = [
  "enumEntries",
  "enumKeys",
  "enumValues",
  "isEnumValue",
  "toEnumValue"
];

// src/readiness/listMembershipSites.ts
var CALLEE_END = /[\w$).>\]]/;
var INCLUDES_CALL = /\s*\.\s*includes\s*\(/y;
var MEMBER_CHAIN = /^\s*[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*\s*$/;
var TYPE_ASSERTION = /\s*as\s+\S/y;
var VALUES_CALL = /(?<![\w$.])Object\s*\.\s*values\s*(?:<[^<>()]*>\s*)?\(/g;
var WHITESPACE = /\s/;
function listMembershipSites(source) {
  const code = blankNonCode(source);
  const sites = [];
  for (const match of code.matchAll(VALUES_CALL)) {
    const argument = readBalancedGroup(code, match.index + match[0].length - 1, PARENTHESES);
    if (argument === void 0) continue;
    if (!MEMBER_CHAIN.test(code.slice(argument.start + 1, argument.end - 1))) continue;
    if (!isSearchedByIncludes(code, match.index, argument.end)) continue;
    sites.push({ kind: "values-includes", line: getLineAtOffset(code, match.index) });
  }
  return sites;
}
function findGroupOpener(code, anchor) {
  let index = anchor - 1;
  while (index >= 0 && WHITESPACE.test(code.charAt(index))) index -= 1;
  if (code.charAt(index) !== "(") return void 0;
  if (CALLEE_END.test(code.charAt(index - 1))) return void 0;
  return index;
}
function isSearchedByIncludes(code, anchor, valuesEnd) {
  if (startsAt(INCLUDES_CALL, code, valuesEnd)) return true;
  const opener = findGroupOpener(code, anchor);
  if (opener === void 0) return false;
  const group = readBalancedGroup(code, opener, PARENTHESES);
  if (group === void 0 || !startsAt(TYPE_ASSERTION, code, valuesEnd)) return false;
  return startsAt(INCLUDES_CALL, code, group.end);
}
function startsAt(pattern, text, offset) {
  pattern.lastIndex = offset;
  return pattern.test(text);
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.enums";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/enums#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listMembershipSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test writes these forms deliberately, and a bootstrap wrapper hand-rolls what it checks so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source tests enum membership by hand",
      id: "no-hand-rolled-enum-membership",
      kinds: ["values-includes"],
      severity: "recommend",
      fix: `Replace each test named above with isEnumValue from ${PACKAGE_NAME}. It returns a type predicate, so the value narrows to a member of the enum wherever the test passes, which a search of the values does not do even with a cast added to satisfy the compiler. Where the test only chooses between the value and undefined, toEnumValue from the same package replaces the whole expression. Both accept only an object whose values are strings or numbers, so a search of an object with values of any other type has no substitution here. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
