/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.36.0";


// ../adoption/src/conventions/path-predicates.ts
var TEST_SUFFIX = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
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
  const kitScope = { noSourcesReason: spec.noSourcesReason, pathFilter: spec.pathFilter };
  const pathFiltersByKind = mapPathFiltersByKind();
  const sweptPathFilters = [
    .../* @__PURE__ */ new Set([spec.pathFilter, ...spec.checks.map((check) => resolveScope(check).pathFilter)])
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
          skip: () => skipUnlessProjectHoldsSources(resolveScope(check)),
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
  function isSweptPath(path) {
    return sweptPathFilters.some((pathFilter) => pathFilter(path));
  }
  function loadSummary() {
    cache.summary ??= readProject();
    return cache.summary;
  }
  function mapPathFiltersByKind() {
    const pathFilters = /* @__PURE__ */ new Map();
    const conflicted = /* @__PURE__ */ new Set();
    for (const check of spec.checks) {
      const { pathFilter } = resolveScope(check);
      for (const kind of check.kinds) {
        const assigned = pathFilters.get(kind);
        if (assigned !== void 0 && assigned !== pathFilter) conflicted.add(kind);
        pathFilters.set(kind, pathFilter);
      }
    }
    if (conflicted.size > 0) {
      const kinds = [...conflicted].toSorted().join(", ");
      throw new Error(`${spec.packageName}'s kit reads one kind through more than one path filter: ${kinds}`);
    }
    return pathFilters;
  }
  async function readProject() {
    const sources = await readTrackedSources(isSweptPath);
    if (sources === void 0) return void 0;
    return {
      adoptedCount: countPackageUsage(sources, adoptedPackage),
      findings: sources.flatMap(
        (source) => spec.detect(source.text).filter((site) => (pathFiltersByKind.get(site.kind) ?? spec.pathFilter)(source.path)).map((site) => ({ ...site, path: source.path }))
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
  function resolveScope(check) {
    return check.pathFilter === void 0 ? kitScope : { noSourcesReason: check.noSourcesReason, pathFilter: check.pathFilter };
  }
  async function skipUnlessProjectHoldsSources(scope) {
    const summary = await loadSummary();
    if (summary === void 0) return NOT_A_REPO;
    return summary.sources.some((source) => scope.pathFilter(source.path)) ? false : scope.noSourcesReason;
  }
}

// ../adoption/src/portable/condenseWhitespace.ts
function condenseWhitespace(text) {
  return text.replaceAll(/\s+/g, " ");
}

// ../adoption/src/portable/readAnchoredWindow.ts
function readAnchoredWindow(source, offset, lengths) {
  return {
    after: condenseWhitespace(source.slice(offset, offset + lengths.lookahead)),
    before: condenseWhitespace(source.slice(Math.max(0, offset - lengths.lookbehind), offset))
  };
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

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = [
  "captureError",
  "captureStdio",
  "createTempTree",
  "pointArgvAt",
  "pointCwdAt"
];

// src/readiness/listCaptureSites.ts
var BRACKETS = { close: "]", open: "[" };
var CALLEE = /^[\w$]+(?:\??\.[\w$]+)*(?:\?\.)?(?:<[^<>()]*>)?$/;
var CALL_PREFIX = /^(?:await )?(?:new )?/;
var CATCH_CLAUSE = /^\s*catch\s*\(/;
var FINALLY_CLAUSE = /^\s*finally\b/;
var CAUGHT_ASSIGNMENT = /^(?<target>[\w$]+) ?= ?(?<caught>[\w$]+)(?: as .+)?$/;
var IDENTIFIER = /^[\w$]+$/;
var LITERAL_ARGUMENT_TAIL = /^(?: as .+)?$/;
var LITERAL_INITIALIZER_TAIL = /^ ?(?: as [^;]+)?;/;
var LOOKBEHIND_LENGTH = 400;
var SCALAR_LITERAL = /^(?:-?\.?\d(?:[eE][+-]|[\w.])*|(?:false|null|true|undefined)(?![\w$]))/;
var STRING_DELIMITERS = /* @__PURE__ */ new Set(['"', "'", "`"]);
var TRAILING_COMMA = /,$/;
var TRAILING_SEMICOLON = /;$/;
var TRY_ANCHOR = /\btry\s*\{/g;
function listCaptureSites(source) {
  const code = blankNonCode(source);
  const sites = [];
  for (const match of code.matchAll(TRY_ANCHOR)) {
    const block = readBalancedGroup(code, match.index, BRACES);
    if (block === void 0) continue;
    if (!isSingleCall(condenseWhitespace(code.slice(block.start + 1, block.end - 1)))) continue;
    const capture = readCatchCapture(code.slice(block.end));
    if (capture === void 0) continue;
    const { before } = readAnchoredWindow(code, match.index, { lookahead: 0, lookbehind: LOOKBEHIND_LENGTH });
    if (!hasOuterDeclaration(before, capture.target)) continue;
    const catchEnd = block.end + capture.end;
    const blockRest = code.slice(catchEnd, findEnclosingBlockEnd(code, catchEnd) ?? code.length);
    const captureRest = blockRest.slice(0, findReassignmentStart(blockRest, capture.target));
    if (hasNonErrorLiteralAssertion(condenseWhitespace(captureRest), capture.target, before)) continue;
    sites.push({
      kind: "hand-rolled-error-capture",
      line: getLineAtOffset(code, match.index),
      symbol: capture.target
    });
  }
  return sites;
}
function escapeIdentifier(name) {
  return name.replaceAll("$", String.raw`\$`);
}
function findEnclosingBlockEnd(code, from) {
  let depth = 0;
  for (let index = from; index < code.length; index += 1) {
    if (code[index] === "{") depth += 1;
    else if (code[index] === "}") {
      if (depth === 0) return index;
      depth -= 1;
    }
  }
  return void 0;
}
function findLiteralEnd(text) {
  const opener = text[0];
  if (opener === "{") return readBalancedGroup(text, 0, BRACES)?.end;
  if (opener === "[") return readBalancedGroup(text, 0, BRACKETS)?.end;
  if (opener !== void 0 && STRING_DELIMITERS.has(opener)) {
    const close = text.indexOf(opener, 1);
    return close === -1 ? void 0 : close + 1;
  }
  return SCALAR_LITERAL.exec(text)?.[0].length;
}
function findReassignmentStart(text, name) {
  return new RegExp(String.raw`(?<![\w$.])${escapeIdentifier(name)}\s*=(?![=>])`).exec(text)?.index;
}
function hasNonErrorLiteralAssertion(blockRest, target, before) {
  const assertion = new RegExp(String.raw`\bexpect\( ?${escapeIdentifier(target)} ?\) ?\.toBe\(`, "g");
  for (const match of blockRest.matchAll(assertion)) {
    const args = readBalancedGroup(blockRest, match.index + match[0].length - 1, PARENTHESES);
    if (args === void 0) continue;
    const expected = blockRest.slice(args.start + 1, args.end - 1).trim().replace(TRAILING_COMMA, "").trim();
    if (isNonErrorLiteral(expected) || isBoundToNonErrorLiteral(before, expected)) return true;
  }
  return false;
}
function hasOuterDeclaration(before, name) {
  return new RegExp(String.raw`\b(?:let|var) ${escapeIdentifier(name)}\b`).test(before);
}
function isBoundToNonErrorLiteral(before, name) {
  if (!IDENTIFIER.test(name)) return false;
  const declaration = new RegExp(String.raw`\bconst ${escapeIdentifier(name)}(?: ?:[^=;]*)? ?= ?`, "g");
  const nearest = before.matchAll(declaration).toArray().at(-1);
  if (nearest === void 0) return false;
  const initializer = before.slice(nearest.index + nearest[0].length);
  const end = findLiteralEnd(initializer);
  return end !== void 0 && LITERAL_INITIALIZER_TAIL.test(initializer.slice(end));
}
function isNonErrorLiteral(expression) {
  const end = findLiteralEnd(expression);
  return end !== void 0 && LITERAL_ARGUMENT_TAIL.test(expression.slice(end));
}
function isSingleCall(body) {
  const statement = body.trim().replace(TRAILING_SEMICOLON, "").trim().replace(CALL_PREFIX, "");
  const args = readBalancedGroup(statement, 0, PARENTHESES);
  if (args === void 0 || args.end !== statement.length) return false;
  return CALLEE.test(statement.slice(0, args.start).trim());
}
function readCatchCapture(tail) {
  const clause = CATCH_CLAUSE.exec(tail);
  if (clause === null) return void 0;
  const bound = readBalancedGroup(tail, clause[0].length - 1, PARENTHESES);
  if (bound === void 0) return void 0;
  const parameter = tail.slice(bound.start + 1, bound.end - 1).split(":", 1)[0]?.trim() ?? "";
  if (!IDENTIFIER.test(parameter)) return void 0;
  const block = readBalancedGroup(tail, bound.end, BRACES);
  if (block === void 0 || tail.slice(bound.end, block.start).trim() !== "") return void 0;
  if (FINALLY_CLAUSE.test(tail.slice(block.end))) return void 0;
  const body = condenseWhitespace(tail.slice(block.start + 1, block.end - 1));
  const assignment = CAUGHT_ASSIGNMENT.exec(body.trim().replace(TRAILING_SEMICOLON, "").trim());
  const target = assignment?.groups?.["target"];
  if (target === void 0 || assignment?.groups?.["caught"] !== parameter) return void 0;
  return { end: block.end, target };
}

// src/readiness/listStdioSpies.ts
var SPY = /\bvi\s*\.\s*spyOn\(\s*process\s*\.\s*std(?:err|out)\s*,\s*(['"])write\1\s*,?\s*\)/g;
function listStdioSpies(source) {
  const code = blankNonCode(source);
  const sites = [];
  for (const match of source.matchAll(SPY)) {
    if (code[match.index] !== source[match.index]) continue;
    sites.push({ kind: "hand-rolled-stdio-capture", line: getLineAtOffset(code, match.index) });
  }
  return sites;
}

// src/readiness/listSites.ts
function listSites(source) {
  return [...listCaptureSites(source), ...listStdioSpies(source)].toSorted((a, b) => a.line - b.line);
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.testing";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/testing#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no test files",
  packageName: PACKAGE_NAME,
  // The selection follows `toolbelt.vitest` rather than the source-oriented kits: these idioms live only in a
  // test, so a sweep exempting tests would report nothing and say so as a pass. No hand-off rule is needed
  // against the two kits whose sweeps could meet this one: `toolbelt.errors` exempts tests altogether, and
  // `toolbelt.vitest` claims no try block and anchors `vi.spyOn` on `console` and `process.exit`, never on a
  // stream.
  pathFilter: isTestFile,
  checks: [
    {
      name: "No test captures a thrown value by hand",
      id: "no-hand-rolled-error-capture",
      kinds: ["hand-rolled-error-capture"],
      severity: "recommend",
      fix: `Replace each capture named above with captureError from ${PACKAGE_NAME}/candidate, which runs the call, hands back what it threw or rejected with, and narrows that to a class the caller names. It fails the test where the call completes normally, so a regression that stops the failure reports itself instead of leaving a later assertion to report an absent value in its place, and the narrowing reaches the error's own fields without a second assertion to get there. Reference: ${README_URL}`
    },
    {
      name: "No test captures stdout or stderr by hand",
      id: "no-hand-rolled-stdio-capture",
      kinds: ["hand-rolled-stdio-capture"],
      severity: "recommend",
      fix: `Replace each spy named above with captureStdio from ${PACKAGE_NAME}/candidate, binding it with using so that both streams are restored when the scope exits. Read the output from its stdout and stderr in place of each spy's mock.calls, or from stdoutChunks and stderrChunks where an assertion is about how the output was split into writes. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
