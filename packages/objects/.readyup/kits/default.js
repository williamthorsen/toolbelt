/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.47.1";


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

// ../adoption/src/kits/listSourceSites.ts
import { blankNonCode } from "readyup/check-utils";
function listSourceSites(detectors, source) {
  const code = blankNonCode(source);
  return detectors.flatMap((detect) => detect(code, source)).toSorted((a, b) => a.line - b.line);
}

// ../adoption/src/kits/defineAdoptionKit.ts
var NOT_A_REPO = "the project is not a git working tree, and these checks read the files that git tracks";
var NOTHING_TO_REPORT = { findings: [] };
function defineAdoptionKit(spec) {
  assertCheckIdsAreUnique(spec);
  const cache = {};
  const adoptedPackage = { exportNames: spec.exportNames, packageName: spec.packageName };
  const kitScope = { noSourcesReason: spec.noSourcesReason, pathFilter: spec.pathFilter };
  const pathFiltersByKind = mapPathFiltersByKind(spec, kitScope);
  const sweptPathFilters = [
    .../* @__PURE__ */ new Set([spec.pathFilter, ...spec.checks.map((check) => resolveScope(check, kitScope).pathFilter)])
  ];
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
          skip: () => skipUnlessProjectHoldsSources(resolveScope(check, kitScope)),
          check: () => reportKinds(check.kinds),
          fix: check.fix
        }))
      }
    ]
  });
  function isSweptPath(path) {
    return sweptPathFilters.some((pathFilter) => pathFilter(path));
  }
  function loadSummary() {
    cache.summary ??= readProject();
    return cache.summary;
  }
  async function readProject() {
    const sources = await readTrackedSources(isSweptPath);
    if (sources === void 0) return void 0;
    return {
      adoptedCount: countPackageUsage(sources, adoptedPackage),
      findings: sources.flatMap(
        (source) => listSourceSites(spec.detectors, source.text).filter((site) => (pathFiltersByKind.get(site.kind) ?? spec.pathFilter)(source.path)).map((site) => ({ ...site, path: source.path }))
      ),
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
  async function skipUnlessProjectHoldsSources(scope) {
    const summary = await loadSummary();
    if (summary === void 0) return NOT_A_REPO;
    return summary.sources.some((source) => scope.pathFilter(source.path)) ? false : scope.noSourcesReason;
  }
}
function assertCheckIdsAreUnique(spec) {
  const seenIds = /* @__PURE__ */ new Set();
  const duplicateIds = /* @__PURE__ */ new Set();
  for (const { id } of spec.checks) {
    if (seenIds.has(id)) duplicateIds.add(id);
    seenIds.add(id);
  }
  if (duplicateIds.size === 0) return;
  const ids = [...duplicateIds].toSorted().join(", ");
  throw new Error(`${spec.packageName}'s kit gives one id to more than one check: ${ids}`);
}
function mapPathFiltersByKind(spec, kitScope) {
  const pathFilters = /* @__PURE__ */ new Map();
  const conflictingKinds = /* @__PURE__ */ new Set();
  for (const check of spec.checks) {
    const { pathFilter } = resolveScope(check, kitScope);
    for (const kind of check.kinds) {
      const assignedPathFilter = pathFilters.get(kind);
      if (assignedPathFilter !== void 0 && assignedPathFilter !== pathFilter) conflictingKinds.add(kind);
      pathFilters.set(kind, pathFilter);
    }
  }
  if (conflictingKinds.size > 0) {
    const kinds = [...conflictingKinds].toSorted().join(", ");
    throw new Error(`${spec.packageName}'s kit reads one kind through more than one path filter: ${kinds}`);
  }
  return pathFilters;
}
function resolveScope(check, kitScope) {
  return check.pathFilter === void 0 ? kitScope : { noSourcesReason: check.noSourcesReason, pathFilter: check.pathFilter };
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

// ../adoption/src/portable/readLiteral.ts
function readLiteral(source, span) {
  const start = span?.[0];
  const end = span?.[1];
  return start === void 0 || end === void 0 ? void 0 : source.slice(start + 1, end - 1);
}

// ../adoption/src/mod.ts
import { blankNonCode as blankNonCode2, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = [
  "getValueAtPathOrThrow",
  "hasKeyAtPath",
  "hasOwnProperty",
  "isEqual",
  "isKeyOf",
  "isObject",
  "isPlainObject",
  "isRecord",
  "isRecordOrArray",
  "isScalar",
  "mapToObject",
  "objectFromKeys",
  "objectSize",
  "omitNullish",
  "omitUndefined",
  "preciseTypeOf",
  "sortKeys",
  "sortObjectKeys"
];

// src/readiness/listOwnPropertyCallSites.ts
var OWN_PROPERTY_CALL = /(?<![\w$.])Object\s*\.\s*prototype\s*\.\s*hasOwnProperty\s*\.\s*call\s*\(/g;
function listOwnPropertyCallSites(code) {
  return code.matchAll(OWN_PROPERTY_CALL).map((match) => ({
    kind: "own-property-call",
    line: getLineAtOffset(code, match.index)
  })).toArray();
}

// src/readiness/listRecordSites.ts
var OBJECT_TAG = "object";
var SUBJECT = String.raw`[\w$]+(?:\.[\w$]+)*`;
var QUOTED = String.raw`(?<literal>(?<quote>['"])[^'"\n]*\k<quote>)`;
var TAIL = String.raw`(?:\s*&&\s*!\s*Array\s*\.\s*isArray\s*\(\s*\k<subject>\s*\))?(?!\s*&&)`;
var TYPEOF_FIRST = new RegExp(
  String.raw`(?<![\w$.])typeof\s+(?<subject>${SUBJECT})\s*===\s*${QUOTED}\s*&&\s*\k<subject>\s*!==?\s*null${TAIL}`,
  "dg"
);
var NULL_FIRST = new RegExp(
  String.raw`(?<![\w$.])(?<subject>${SUBJECT})\s*!==?\s*null\s*&&\s*typeof\s+\k<subject>\s*===\s*${QUOTED}${TAIL}`,
  "dg"
);
function listRecordSites(code, source) {
  const lines = [TYPEOF_FIRST, NULL_FIRST].flatMap((pattern) => listLinesMatching(pattern, code, source));
  return [...new Set(lines)].toSorted((a, b) => a - b).map((line) => ({ kind: "record-inline", line }));
}
function listLinesMatching(pattern, code, source) {
  return code.matchAll(pattern).filter((match) => readLiteral(source, match.indices?.groups?.["literal"]) === OBJECT_TAG).map((match) => getLineAtOffset(code, match.index)).toArray();
}

// src/readiness/listStringifyCompareSites.ts
var STRINGIFY_CALL = /(?<![\w$.])JSON\s*\.\s*stringify\s*\(/g;
var COMPARED_TO_STRINGIFY = /\s*[!=]==?\s*JSON\s*\.\s*stringify\s*\(/y;
function listStringifyCompareSites(code) {
  const sites = [];
  for (const match of code.matchAll(STRINGIFY_CALL)) {
    const argumentList = readBalancedGroup(code, match.index, PARENTHESES);
    if (argumentList === void 0) continue;
    COMPARED_TO_STRINGIFY.lastIndex = argumentList.end;
    if (!COMPARED_TO_STRINGIFY.test(code)) continue;
    sites.push({ kind: "stringify-compare", line: getLineAtOffset(code, match.index) });
  }
  return sites;
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.objects";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/objects#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detectors: [listOwnPropertyCallSites, listRecordSites, listStringifyCompareSites],
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project contains no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test writes these forms deliberately, and a bootstrap wrapper hand-rolls its object handling so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source reaches hasOwnProperty through the prototype",
      id: "no-hand-rolled-own-property",
      kinds: ["own-property-call"],
      severity: "recommend",
      fix: `Object.hasOwn is the platform form and is enough wherever the result narrows nothing: It takes the target and the key directly. Take hasOwnProperty from ${PACKAGE_NAME}/candidate when the call guards a property read, since it returns a type predicate that narrows the target and Object.hasOwn returns a bare boolean. Reference: ${README_URL}`
    },
    {
      name: "No source guards a record by hand",
      id: "no-hand-rolled-record-guard",
      kinds: ["record-inline"],
      severity: "recommend",
      fix: `Replace each expression named above with isRecord from ${PACKAGE_NAME} when it excludes arrays, and isRecordOrArray when it admits them. Both return a type predicate, so the narrowing performed by the expression is preserved. For the stricter question of whether a value has Object.prototype and nothing exotic, isPlainObject answers it; the expressions named above do not ask it. Reference: ${README_URL}`
    },
    {
      name: "No source compares two serializations",
      id: "no-stringify-comparison",
      kinds: ["stringify-compare"],
      severity: "warn",
      fix: `Replace each comparison named above with isEqual from ${PACKAGE_NAME}/candidate. Comparing serializations answers the wrong question twice: The result is key-order dependent, so two objects with the same entries in a different order compare unequal, and a Set serializes as an empty object whatever it contains, which makes any two Sets compare equal. isEqual sorts keys and converts Sets to arrays before comparing. Mind what serialization drops: A value that contains a function, a symbol, or undefined compares by what survives, under isEqual as much as by hand. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
