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

// ../adoption/src/portable/condenseWhitespace.ts
function condenseWhitespace(text) {
  return text.replaceAll(/\s+/g, " ");
}

// ../adoption/src/portable/readBalancedGroup.ts
var BRACES = { close: "}", open: "{" };
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

// ../adoption/src/portable/listFunctionBodies.ts
var FUNCTION_HEAD = /(?:function\s+(?<declared>\w+)\s*(?:<[^<>]*>\s*)?\(|(?:const|let|var)\s+(?<bound>\w+)[^=;]*=\s*(?:async\s+)?(?:function\s*)?(?:<[^<>]*>\s*)?\((?<arrowParameters>[^)]*)\)[^=;{]*=>)/g;
var PLAIN_PARAMETER = /^\s*(?<name>[A-Za-z_$][\w$]*)\s*(?=[,:=?]|$)/;
function listFunctionBodies(source) {
  const bodies = [];
  FUNCTION_HEAD.lastIndex = 0;
  let head = FUNCTION_HEAD.exec(source);
  while (head !== null) {
    const name = head.groups?.["declared"] ?? head.groups?.["bound"];
    const from = findBodySearchStart(source, head);
    const body = from === void 0 ? void 0 : readBalancedGroup(source, from, BRACES);
    if (name !== void 0 && from !== void 0 && body !== void 0 && !source.slice(from, body.start).includes(";")) {
      const firstParameter = findFirstParameterName(readParameterText(source, head));
      bodies.push({
        bodyEnd: body.end,
        bodyStart: body.start,
        ...firstParameter !== void 0 && { firstParameter },
        headStart: head.index,
        name
      });
    }
    head = FUNCTION_HEAD.exec(source);
  }
  return bodies;
}
function findBodySearchStart(source, head) {
  if (head.groups?.["declared"] === void 0) return head.index + head[0].length;
  return readBalancedGroup(source, head.index, PARENTHESES)?.end;
}
function findFirstParameterName(parameterText) {
  if (parameterText === void 0) return void 0;
  return PLAIN_PARAMETER.exec(parameterText)?.groups?.["name"];
}
function readParameterText(source, head) {
  const arrowParameters = head.groups?.["arrowParameters"];
  if (arrowParameters !== void 0) return arrowParameters;
  const group = readBalancedGroup(source, head.index, PARENTHESES);
  return group === void 0 ? void 0 : source.slice(group.start + 1, group.end - 1);
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
  "assert",
  "assertIsNonNullable",
  "isBoolean",
  "isNonNullable",
  "isNullish",
  "isNumber",
  "isString"
];

// src/readiness/nullish-tests.ts
var SUBJECT = String.raw`(?<subject>[\w$]+)`;
var NON_NULLABLE_TESTS = [
  new RegExp(String.raw`^${SUBJECT}\s*!==\s*null\s*&&\s*\k<subject>\s*!==\s*undefined$`),
  new RegExp(String.raw`^${SUBJECT}\s*!==\s*undefined\s*&&\s*\k<subject>\s*!==\s*null$`),
  new RegExp(String.raw`^${SUBJECT}\s*!=\s*null$`)
];
var NULLISH_TESTS = [
  new RegExp(String.raw`^${SUBJECT}\s*===\s*null\s*\|\|\s*\k<subject>\s*===\s*undefined$`),
  new RegExp(String.raw`^${SUBJECT}\s*===\s*undefined\s*\|\|\s*\k<subject>\s*===\s*null$`),
  new RegExp(String.raw`^${SUBJECT}\s*==\s*null$`)
];
function isNonNullableTest(expression, subject) {
  return matchesAny(NON_NULLABLE_TESTS, expression, subject);
}
function isNullishTest(expression, subject) {
  return matchesAny(NULLISH_TESTS, expression, subject);
}
function matchesAny(patterns, expression, subject) {
  return patterns.some((pattern) => pattern.exec(expression.trim())?.groups?.["subject"] === subject);
}

// src/readiness/findAssertionClone.ts
var GUARD = /\bif\s*\(/g;
var NEGATION = /^!\s*/;
var RETURN_STATEMENT = /^return\s*[;}]/;
var THROW_STATEMENT = /^throw\b/;
function findAssertionClone(body, parameter) {
  const condensed = condenseWhitespace(body).trim();
  if (!isAssertionBody(condensed)) return void 0;
  const tests = listGuardedTests(condensed);
  if (tests.some((test) => testsOwnArgument(test, parameter))) return "assert-clone";
  if (tests.some((test) => testsOwnArgumentForNullish(test, parameter))) return "nullish-assert-clone";
  return void 0;
}
function blankConditions(condensed) {
  let blanked = condensed;
  for (const match of condensed.matchAll(GUARD)) {
    const group = readBalancedGroup(condensed, match.index, PARENTHESES);
    if (group === void 0) continue;
    blanked = blanked.slice(0, match.index) + " ".repeat(group.end - match.index) + blanked.slice(group.end);
  }
  return blanked;
}
function isAssertionBody(condensed) {
  const statements = blankConditions(condensed).replaceAll(/\belse\b/g, " ").replaceAll(/[{}]/g, " ").split(";").map((statement) => statement.trim()).filter((statement) => statement !== "");
  return statements.some((statement) => THROW_STATEMENT.test(statement)) && statements.every((statement) => THROW_STATEMENT.test(statement) || statement === "return");
}
function listGuardedTests(condensed) {
  const tests = [];
  for (const match of condensed.matchAll(GUARD)) {
    const group = readBalancedGroup(condensed, match.index, PARENTHESES);
    if (group === void 0) continue;
    const outcome = readOutcome(condensed.slice(group.end));
    if (outcome !== void 0) {
      tests.push({ condition: condensed.slice(group.start + 1, group.end - 1).trim(), outcome });
    }
  }
  return tests;
}
function readOutcome(afterCondition) {
  const statement = afterCondition.replace(/^\s*\{?\s*/, "");
  if (THROW_STATEMENT.test(statement)) return "throw";
  if (RETURN_STATEMENT.test(statement)) return "return";
  return void 0;
}
function testsOwnArgument({ condition, outcome }, parameter) {
  if (outcome === "return") return condition === parameter;
  return NEGATION.test(condition) && condition.replace(NEGATION, "") === parameter;
}
function testsOwnArgumentForNullish({ condition, outcome }, parameter) {
  return outcome === "throw" ? isNullishTest(condition, parameter) : isNonNullableTest(condition, parameter);
}

// src/readiness/findPredicateClone.ts
var RETURNED_EXPRESSION = /^\{\s*return\b(?<expression>[^;{}]*)[\s;]*\}$/;
var TYPEOF_BODY = /^\{\s*return\s+typeof\s+(?<subject>[\w$]+)\s*===\s*(?<literal>(?<quote>['"])[^'"\n]*\k<quote>)(?:\s*&&\s*!\s*Number\s*\.\s*isNaN\s*\(\s*\k<subject>\s*\))?[\s;]*\}$/d;
var TAG_KINDS = /* @__PURE__ */ new Map([
  ["boolean", "boolean-clone"],
  ["number", "number-clone"],
  ["string", "string-clone"]
]);
function findPredicateClone(body, source, bodyStart, parameter) {
  const typeofMatch = TYPEOF_BODY.exec(body);
  if (typeofMatch !== null && typeofMatch.groups?.["subject"] === parameter) {
    const tag = readLiteral(source, shiftSpan(typeofMatch.indices?.groups?.["literal"], bodyStart));
    return tag === void 0 ? void 0 : TAG_KINDS.get(tag);
  }
  const expression = RETURNED_EXPRESSION.exec(body)?.groups?.["expression"]?.trim();
  if (expression === void 0 || expression === "") return void 0;
  if (isNonNullableTest(expression, parameter)) return "non-nullable-clone";
  if (isNullishTest(expression, parameter)) return "nullish-clone";
  return void 0;
}
function shiftSpan(span, offset) {
  const start = span?.[0];
  const end = span?.[1];
  return start === void 0 || end === void 0 ? void 0 : [start + offset, end + offset];
}

// src/readiness/listGuardClones.ts
function listGuardClones(source) {
  const code = blankNonCode(source);
  return listFunctionBodies(code).flatMap((fn) => {
    const parameter = fn.firstParameter;
    if (parameter === void 0) return [];
    const body = code.slice(fn.bodyStart, fn.bodyEnd);
    const kind = findPredicateClone(body, source, fn.bodyStart, parameter) ?? findAssertionClone(body, parameter);
    return kind === void 0 ? [] : [{ kind, line: getLineAtOffset(code, fn.headStart), symbol: fn.name }];
  });
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.guards";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/guards#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listGuardClones,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test writes these shapes deliberately, and a bootstrap wrapper hand-rolls its guards so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source defines its own assertion",
      id: "no-assertion-clone",
      kinds: ["assert-clone", "nullish-assert-clone"],
      fix: `Delete the function named above and import assert from ${PACKAGE_NAME}, or assertIsNonNullable where the function asserts that a value is neither null nor undefined. One import retires the whole helper, and both carry an asserts signature, so a caller that relied on the narrowing keeps it. Reference: ${README_URL}`
    },
    {
      name: "No source defines its own type guard",
      id: "no-predicate-clone",
      kinds: ["boolean-clone", "non-nullable-clone", "nullish-clone", "string-clone"],
      fix: `Delete the function named above and import the guard that it re-implements from ${PACKAGE_NAME}: isString, isBoolean, isNonNullable, or isNullish. Each returns a type predicate, so the narrowing that the function performed is preserved. Reference: ${README_URL}`
    },
    {
      name: "No source defines its own number guard",
      id: "no-number-guard-clone",
      kinds: ["number-clone"],
      severity: "recommend",
      fix: `Import isNumber from ${PACKAGE_NAME} in place of the function named above. Weigh the difference before taking it: isNumber returns false for NaN, which typeof reports as a number, so a function testing typeof alone changes behavior on NaN. A function that already excludes NaN is an exact substitution. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
