/** @noformat — @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.32.0";


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
var FUNCTION_HEAD = /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)[^=;]*=\s*(?:async\s+)?(?:function\s*)?\([^)]*\)[^=;{]*=>)/g;
function listFunctionBodies(source) {
  const bodies = [];
  FUNCTION_HEAD.lastIndex = 0;
  let head = FUNCTION_HEAD.exec(source);
  while (head !== null) {
    const name = head[1] ?? head[2];
    const from = findBodySearchStart(source, head);
    const body = from === void 0 ? void 0 : readBalancedGroup(source, from, BRACES);
    if (name !== void 0 && from !== void 0 && body !== void 0 && !source.slice(from, body.start).includes(";")) {
      bodies.push({ bodyEnd: body.end, bodyStart: body.start, headStart: head.index, name });
    }
    head = FUNCTION_HEAD.exec(source);
  }
  return bodies;
}
function findBodySearchStart(source, head) {
  if (head[1] === void 0) return head.index + head[0].length;
  return readBalancedGroup(source, head.index, PARENTHESES)?.end;
}

// ../adoption/src/portable/readAnchoredWindow.ts
function readAnchoredWindow(source, offset, lengths) {
  return {
    after: condenseWhitespace(source.slice(offset, offset + lengths.lookahead)),
    before: condenseWhitespace(source.slice(Math.max(0, offset - lengths.lookbehind), offset))
  };
}

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = ["assertIsError", "chainError", "describeError", "isError"];

// src/readiness/classifySite.ts
var DESCRIBE_TERNARY = /^instanceof Error \? [\w.]+\.message :/;
var DESCRIBE_STATEMENT = /^instanceof Error\)+ ?(?:\{ )?return [\w.]+\.message/;
var COERCE_TERNARY = /^instanceof Error \? [\w.]+ : new \w*Error\b/;
var NEGATED_OPERAND = /!\(\s*[\w.]+\s*$/;
function classifySite(before, after) {
  if (DESCRIBE_TERNARY.test(after) || DESCRIBE_STATEMENT.test(after)) return "describe-inline";
  if (COERCE_TERNARY.test(after)) return "coerce";
  if (NEGATED_OPERAND.test(before) && after.includes("throw")) return "assert";
  return "narrow";
}

// src/readiness/listDescribeClones.ts
function listDescribeClones(source) {
  return listFunctionBodies(source).filter((fn) => isDescribeBody(source.slice(fn.bodyStart, fn.bodyEnd))).map((fn) => ({ end: fn.bodyEnd, name: fn.name, start: fn.headStart }));
}
function isDescribeBody(body) {
  const collapsed = condenseWhitespace(body).trim();
  if (!collapsed.includes("instanceof Error") || !/return [\w.]+\.message/.test(collapsed)) return false;
  const statements = collapsed.replaceAll(/if \([^()]*\)/g, "").replaceAll(/else/g, "").replaceAll(/[{}]/g, " ").split(";").map((statement) => statement.trim()).filter((statement) => statement !== "");
  return statements.length > 0 && statements.every((statement) => statement.startsWith("return"));
}

// src/readiness/listErrorSites.ts
var OPERATOR = /\binstanceof\s+Error\b/g;
var WINDOW = { lookahead: 240, lookbehind: 80 };
function listErrorSites(source) {
  const code = blankNonCode(source);
  const clones = listDescribeClones(code);
  const sites = [];
  const claimed = /* @__PURE__ */ new Set();
  for (const match of code.matchAll(OPERATOR)) {
    const clone = clones.find((candidate) => match.index > candidate.start && match.index < candidate.end);
    const line = getLineAtOffset(code, match.index);
    if (clone === void 0) {
      const { after, before } = readAnchoredWindow(code, match.index, WINDOW);
      sites.push({ kind: classifySite(before, after), line });
    } else if (!claimed.has(clone.name)) {
      claimed.add(clone.name);
      sites.push({ kind: "describe-clone", line, symbol: clone.name });
    }
  }
  return sites;
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.errors";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/errors#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listErrorSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test constructs error shapes deliberately, and a bootstrap wrapper's hand-rolled handling is what keeps
  // its build-first message alive through an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source defines its own description helper",
      id: "no-describe-clone",
      kinds: ["describe-clone"],
      fix: `Delete the function named above and import describeError from ${PACKAGE_NAME}. One import retires the whole helper. Reference: ${README_URL}`
    },
    {
      name: "No source describes a thrown value inline",
      id: "no-inline-description",
      kinds: ["describe-inline"],
      fix: `Replace each expression named above with describeError, imported from ${PACKAGE_NAME}. A domain-literal fallback discards what was thrown; describeError keeps it.`
    },
    {
      name: "No source narrows a thrown value by hand",
      id: "no-instanceof-error",
      kinds: ["assert", "narrow"],
      severity: "recommend",
      fix: `Use isError from ${PACKAGE_NAME}, or assertIsError from ${PACKAGE_NAME}/candidate where the narrowing throws. Both recognize an Error crossing a realm boundary, which a bare instanceof test reports as false.`
    },
    {
      name: "No source coerces a thrown value to an Error by hand",
      id: "no-error-coercion",
      kinds: ["coerce"],
      severity: "recommend",
      fix: `${PACKAGE_NAME} publishes no coercer, so this reports an unmet need rather than a substitution. Raise it at ${README_URL} if the sites above are worth one.`
    }
  ]
});
export {
  default_default as default
};
