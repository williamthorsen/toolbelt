/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.35.0";


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
var NOT_A_REPO = "the project is not a git working tree, and these checks read the files git tracks";
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

// ../adoption/src/portable/readLiteral.ts
function readLiteral(source, span) {
  const start = span?.[0];
  const end = span?.[1];
  return start === void 0 || end === void 0 ? void 0 : source.slice(start + 1, end - 1);
}

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = [
  "capitalize",
  "condenseWhitespace",
  "dedent",
  "enclose",
  "hashString",
  "interpolate",
  "Interpolator",
  "isPatternMatch",
  "joinTruthy",
  "obfuscate",
  "pickVariants",
  "pluralize",
  "pluralizeWithCount",
  "removeWhitespace",
  "safeTrim",
  "slugify",
  "stripCommonIndent",
  "TextNode",
  "toCamelCase",
  "toOrdinal",
  "toSortableName",
  "trimWhitespace"
];

// src/readiness/listCapitalizeLines.ts
var CAPITALIZE_INLINE = /(?<![\w$.])(?<subject>[\w$]+(?:\.[\w$]+)*)\s*(?:\.charAt\(\s*0\s*\)|\[\s*0\s*\])\s*\.toUpperCase\(\)\s*(?:\+|\}\$\{)\s*\k<subject>\s*\.(?:slice|substring)\(\s*1\s*\)(?!\s*\.)/g;
function listCapitalizeLines(source) {
  return source.matchAll(CAPITALIZE_INLINE).map((match) => getLineAtOffset(source, match.index)).toArray();
}

// src/readiness/listPluralizeLines.ts
var QUOTED = `'[^']*'|"[^"]*"`;
var PLURALIZE_TERNARY = new RegExp(
  String.raw`(?<op>===|!==)\s*1\s*\)*\s*\?\s*(?<first>${QUOTED})\s*:\s*(?<second>${QUOTED})`,
  "dg"
);
function listPluralizeLines(code, source) {
  const lines = [];
  for (const match of code.matchAll(PLURALIZE_TERNARY)) {
    const first = readLiteral(source, match.indices?.groups?.["first"]);
    const second = readLiteral(source, match.indices?.groups?.["second"]);
    if (first === void 0 || second === void 0) continue;
    const takesSingularFirst = match.groups?.["op"] === "===";
    const singular = takesSingularFirst ? first : second;
    const plural = takesSingularFirst ? second : first;
    if (plural !== `${singular}s`) continue;
    lines.push(getLineAtOffset(code, match.index));
  }
  return lines;
}

// src/readiness/listStringIdioms.ts
function listStringIdioms(source) {
  const code = blankNonCode(source);
  const sites = [
    ...toSites("capitalize-inline", listCapitalizeLines(code)),
    ...toSites("pluralize-inline", listPluralizeLines(code, source))
  ];
  return sites.toSorted((a, b) => a.line - b.line);
}
function toSites(kind, lines) {
  return lines.map((line) => ({ kind, line }));
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.strings";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/strings#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listStringIdioms,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test writes these forms deliberately, and a bootstrap wrapper's hand-rolled string handling is what
  // keeps its build-first message alive through an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source capitalizes a string by hand",
      id: "no-hand-rolled-capitalize",
      kinds: ["capitalize-inline"],
      severity: "recommend",
      fix: `Replace each expression named above with capitalize from ${PACKAGE_NAME}/candidate. From the charAt(0) form the substitution is exact; from the subscript form it is a correction, since indexing an empty string yields undefined and throws, where capitalize returns the empty string. Reference: ${README_URL}`
    },
    {
      name: "No source pluralizes a word by hand",
      id: "no-hand-rolled-pluralize",
      kinds: ["pluralize-inline"],
      severity: "recommend",
      fix: `Replace each expression named above with pluralize from ${PACKAGE_NAME}, called as pluralize(count, singular) or, for an irregular plural, pluralize(count, singular, plural). It takes the whole word rather than a suffix, so a site splicing an s takes the word too; pluralizeWithCount prints the count alongside. Mind the sign: pluralize tests Math.abs(count), so a count of -1 takes the singular where a hand-rolled equality test takes the plural. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
