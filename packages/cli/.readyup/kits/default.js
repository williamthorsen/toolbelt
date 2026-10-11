/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.40.0";


// ../adoption/src/conventions/path-predicates.ts
var JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
var TEST_DIRECTORY = /(?:^|\/)__tests__\//;
var TEST_SUFFIX = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
function isAdoptableSourceOrBin(path) {
  return isJsTsSource(path) && !isTestFile(path) && !isInTestDirectory(path);
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

// ../adoption/src/portable/readLiteral.ts
function readLiteral(source, span) {
  const start = span?.[0];
  const end = span?.[1];
  return start === void 0 || end === void 0 ? void 0 : source.slice(start + 1, end - 1);
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

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = [
  "createCli",
  "defineCommand",
  "defineGroup",
  "ParseError",
  "parseArgs",
  "readStreamText",
  "renderHelp",
  "runCli",
  "UsageError"
];

// src/readiness/listParserSites.ts
var LITERAL = String.raw`(?<literal>'[^'\n]*'|"[^"\n]*")`;
var FLAG_COMPARISONS = [
  new RegExp(String.raw`(?:===|!==)\s*${LITERAL}`, "dg"),
  new RegExp(String.raw`${LITERAL}\s*(?:===|!==)`, "dg"),
  new RegExp(String.raw`\bcase\s+${LITERAL}\s*:`, "dg"),
  new RegExp(String.raw`\.(?:includes|indexOf)\(\s*${LITERAL}\s*\)`, "dg")
];
var FLAG_NAME = /^(?:-[A-Za-z]|--[A-Za-z][\w-]*)$/;
var IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
var IMPORT_STATEMENT = /\bimport\s+(?!type\b)(?<clause>[^;'"]*?)\s*\bfrom\s*(?<specifier>'[^'\n]*'|"[^"\n]*")/dg;
var NAMESPACE_BINDING = /^\*\s*as\s+(?<name>[A-Za-z_$][\w$]*)$/;
var NAMED_BINDING = /^(?<imported>[A-Za-z_$][\w$]*)(?:\s+as\s+(?<local>[A-Za-z_$][\w$]*))?$/;
var PLATFORM_SPECIFIERS = /* @__PURE__ */ new Set(["node:util", "util"]);
var PLATFORM_EXPORT = "parseArgs";
function listParserSites(source) {
  const code = blankNonCode(source);
  return [...listPlatformParseCalls(code, source), ...listFlagScans(code, source)].toSorted(
    (left, right) => left.line - right.line
  );
}
function findEnclosingBody(bodies, offset) {
  let enclosing;
  for (const body of bodies) {
    const contains = body.bodyStart <= offset && offset < body.bodyEnd;
    if (contains && (enclosing === void 0 || body.bodyStart > enclosing.bodyStart)) enclosing = body;
  }
  return enclosing;
}
function listFlagScans(code, source) {
  const bodies = listFunctionBodies(code);
  const firstOffsets = /* @__PURE__ */ new Map();
  for (const pattern of FLAG_COMPARISONS) {
    for (const match of code.matchAll(pattern)) {
      if (!FLAG_NAME.test(readLiteral(source, match.indices?.groups?.["literal"]) ?? "")) continue;
      const body = findEnclosingBody(bodies, match.index);
      const first = firstOffsets.get(body);
      if (first === void 0 || match.index < first) firstOffsets.set(body, match.index);
    }
  }
  return [...firstOffsets].map(([body, offset]) => ({
    kind: "flag-scan",
    line: getLineAtOffset(source, offset),
    ...body !== void 0 && { symbol: body.name }
  }));
}
function listPlatformParseCalls(code, source) {
  const { functions, namespaces } = readPlatformBindings(code, source);
  const callees = [
    ...[...functions].map((name) => String.raw`(?<![.\w$])${RegExp.escape(name)}`),
    ...[...namespaces].map((name) => String.raw`(?<![.\w$])${RegExp.escape(name)}\s*\.\s*${PLATFORM_EXPORT}`)
  ];
  if (callees.length === 0) return [];
  const call = new RegExp(String.raw`(?:${callees.join("|")})\s*\(`, "g");
  return code.matchAll(call).map((match) => ({
    kind: "node-parse-args",
    line: getLineAtOffset(source, match.index)
  })).toArray();
}
function readPlatformBindings(code, source) {
  const functions = /* @__PURE__ */ new Set();
  const namespaces = /* @__PURE__ */ new Set();
  for (const match of code.matchAll(IMPORT_STATEMENT)) {
    if (!PLATFORM_SPECIFIERS.has(readLiteral(source, match.indices?.groups?.["specifier"]) ?? "")) continue;
    const clause = match.groups?.["clause"] ?? "";
    const braceStart = clause.indexOf("{");
    const named = braceStart === -1 ? "" : clause.slice(braceStart + 1, clause.lastIndexOf("}"));
    const unnamed = braceStart === -1 ? clause : clause.slice(0, braceStart);
    for (const entry of unnamed.split(",")) {
      const part = entry.trim();
      const namespace = NAMESPACE_BINDING.exec(part)?.groups?.["name"];
      if (namespace !== void 0) namespaces.add(namespace);
      else if (IDENTIFIER.test(part)) namespaces.add(part);
    }
    for (const entry of named.split(",")) {
      const binding = NAMED_BINDING.exec(entry.trim())?.groups;
      if (binding?.["imported"] === PLATFORM_EXPORT) functions.add(binding["local"] ?? PLATFORM_EXPORT);
    }
  }
  return { functions, namespaces };
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.cli";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/cli#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listParserSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project contains no JavaScript or TypeScript sources outside its tests",
  packageName: PACKAGE_NAME,
  // A command-line parser usually lives in a runner under `bin/` or `src/bin/`, which the other kits exempt as a
  // bootstrap wrapper. A wrapper that only forwards its arguments contains neither idiom.
  pathFilter: isAdoptableSourceOrBin,
  checks: [
    {
      name: "No source parses arguments with the parseArgs of node:util",
      id: "no-node-parse-args",
      kinds: ["node-parse-args"],
      severity: "recommend",
      fix: `Replace the parseArgs call named above with parseArgs from ${PACKAGE_NAME}/candidate, which parses strictly against a schema of flags and operands, infers their types from it, narrows a value to its choices, and reports every rejection as a ParseError. Where the code around the call also writes help text or dispatches subcommands, define each command with defineCommand and group them with defineGroup, then run the tree with runCli, which renders help from the same definitions and resolves to the exit code. Reference: ${README_URL}`
    },
    {
      name: "No source compares arguments against flag names by hand",
      id: "no-hand-rolled-flag-scan",
      kinds: ["flag-scan"],
      severity: "recommend",
      fix: `Replace the comparisons in the function named above by declaring its flags in a schema: define the command with defineCommand from ${PACKAGE_NAME}/candidate, group commands with defineGroup, and run the tree with runCli. runCli intercepts -h and --help at every level, prints the version for -V and --version at the root when its version option is set, renders help from the definitions, and reports a usage error with a pointer to help. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
