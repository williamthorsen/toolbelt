/** @noformat — @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.27.0";


// .readyup/kits/default.ts
import { defineRdyKit } from "readyup";
import { discoverWorkspaces, isGitRepo, readFile, runGit } from "readyup/check-utils";

// src/readiness/buildKindReport.ts
function buildKindReport(summary, kinds) {
  const named = summary.findings.filter((finding) => kinds.includes(finding.kind));
  const progress = {
    count: summary.adopted + summary.findings.length,
    passedCount: summary.adopted,
    type: "fraction"
  };
  if (named.length === 0) return { ok: true, progress };
  return { detail: named.map((finding) => describeFinding(finding)).join(", "), ok: false, progress };
}
function describeFinding(finding) {
  const location = `${finding.path}:${finding.line}`;
  return finding.symbol === void 0 ? location : `${finding.symbol} (${location})`;
}

// src/readiness/exemptions.ts
var EXEMPTIONS = [
  {
    pattern: /(?:^|\/)bin\//,
    reason: "a bootstrap wrapper imports nothing, so its build-first message survives an incomplete install"
  },
  {
    pattern: /(?:^|\/)\.readyup\/kits\/.+\.js$/,
    reason: "a compiled kit bundle is generated from a source the sweep already reads, and editing it breaks its recorded hash"
  },
  { pattern: /(?:^|\/)__tests__\//, reason: "a test constructs error shapes deliberately" },
  { pattern: /\.(?:spec|test)\.[cm]?[jt]sx?$/, reason: "a test constructs error shapes deliberately" },
  { pattern: /(?:^|\/)node_modules\//, reason: "a dependency is not the reader\u2019s code" }
];
function findExemption(path) {
  return EXEMPTIONS.find((exemption) => exemption.pattern.test(path))?.reason;
}

// src/readiness/listSourceFiles.ts
var SOURCE_EXTENSION = /\.[cm]?[jt]sx?$/;
function listSourceFiles(paths) {
  return paths.filter((path) => SOURCE_EXTENSION.test(path) && findExemption(path) === void 0);
}

// src/readiness/packageName.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.errors";

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
var FUNCTION_HEAD = /(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)[^=;]*=\s*(?:async\s+)?(?:function\s*)?\([^)]*\)[^=;{]*=>)/g;
function listDescribeClones(source) {
  const clones = [];
  FUNCTION_HEAD.lastIndex = 0;
  let head = FUNCTION_HEAD.exec(source);
  while (head !== null) {
    const name = head[1] ?? head[2];
    const body = readBody(source, head.index + head[0].length);
    if (name !== void 0 && body !== void 0 && isDescribeBody(source.slice(body.start, body.end))) {
      clones.push({ end: body.end, name, start: head.index });
    }
    head = FUNCTION_HEAD.exec(source);
  }
  return clones;
}
function isDescribeBody(body) {
  const collapsed = body.replaceAll(/\s+/g, " ").trim();
  if (!collapsed.includes("instanceof Error") || !/return [\w.]+\.message/.test(collapsed)) return false;
  const statements = collapsed.replaceAll(/if \([^()]*\)/g, "").replaceAll(/else/g, "").replaceAll(/[{}]/g, " ").split(";").map((statement) => statement.trim()).filter((statement) => statement !== "");
  return statements.length > 0 && statements.every((statement) => statement.startsWith("return"));
}
function readBody(source, from) {
  const start = source.indexOf("{", from);
  if (start === -1 || source.slice(from, start).includes(";")) return void 0;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return { end: index + 1, start };
    }
  }
  return void 0;
}

// src/readiness/listErrorSites.ts
var OPERATOR = /\binstanceof\s+Error\b/g;
var LOOKBEHIND = 80;
var LOOKAHEAD = 240;
function listErrorSites(source) {
  const clones = listDescribeClones(source);
  const sites = [];
  const claimed = /* @__PURE__ */ new Set();
  OPERATOR.lastIndex = 0;
  let match = OPERATOR.exec(source);
  while (match !== null) {
    const clone = clones.find(
      (candidate) => match !== null && match.index > candidate.start && match.index < candidate.end
    );
    const line = countLines(source, match.index);
    if (clone === void 0) {
      const before = collapse(source.slice(Math.max(0, match.index - LOOKBEHIND), match.index));
      const after = collapse(source.slice(match.index, match.index + LOOKAHEAD));
      sites.push({ kind: classifySite(before, after), line });
    } else if (!claimed.has(clone.name)) {
      claimed.add(clone.name);
      sites.push({ kind: "describe-clone", line, symbol: clone.name });
    }
    match = OPERATOR.exec(source);
  }
  return sites;
}
function collapse(text) {
  return text.replaceAll(/\s+/g, " ");
}
function countLines(source, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source[cursor] === "\n") line += 1;
  }
  return line;
}

// src/readiness/summarizeSources.ts
var EXPORT_NAMES = `assertIsError|chainError|describeError|isError`;
var CALL = new RegExp(String.raw`\b(?:${EXPORT_NAMES})\s*\(`, "g");
function summarizeSources(sources) {
  return {
    adopted: sources.reduce((total, source) => total + countAdoptedCalls(source.text), 0),
    findings: sources.flatMap((source) => listErrorSites(source.text).map((site) => ({ ...site, path: source.path }))),
    sourceCount: sources.length
  };
}
function countAdoptedCalls(text) {
  return importsPackage(text) ? text.matchAll(CALL).toArray().length : 0;
}
function importsPackage(text) {
  const specifier = String.raw`${PACKAGE_NAME.replaceAll(".", String.raw`\.`)}(?:/[\w-]+)*`;
  return new RegExp(String.raw`(?:from|require\()\s*['"]${specifier}['"]`).test(text);
}

// .readyup/kits/default.ts
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/errors#readme";
var NOT_A_REPO = "the project is not a git working tree, and these checks read the files git tracks";
var NO_SOURCES = "the project holds no JavaScript or TypeScript sources outside the exempt paths";
var SELF = "this project publishes the package these checks are for";
var cache = {};
var default_default = defineRdyKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  defaultSeverity: "warn",
  checklists: [
    {
      name: "adoption",
      checks: [
        {
          name: "No source defines its own description helper",
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds("describe-clone"),
          fix: `Delete the function named above and import describeError from ${PACKAGE_NAME}. One import retires the whole helper. Reference: ${README_URL}`
        },
        {
          name: "No source describes a thrown value inline",
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds("describe-inline"),
          fix: `Replace each expression named above with describeError, imported from ${PACKAGE_NAME}. A domain-literal fallback discards what was thrown; describeError keeps it.`
        },
        {
          name: "No source narrows a thrown value by hand",
          severity: "recommend",
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds("assert", "narrow"),
          fix: `Use isError from ${PACKAGE_NAME}, or assertIsError from ${PACKAGE_NAME}/candidate where the narrowing throws. Both recognize an Error crossing a realm boundary, which a bare instanceof test reports as false.`
        },
        {
          name: "No source coerces a thrown value to an Error by hand",
          severity: "recommend",
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds("coerce"),
          fix: `${PACKAGE_NAME} publishes no coercer, so this reports an unmet need rather than a substitution. Raise it at ${README_URL} if the sites above are worth one.`
        }
      ]
    }
  ]
});
function loadSummary() {
  cache.summary ??= readProject();
  return cache.summary;
}
async function listTrackedPaths() {
  if (!await isGitRepo(".")) return void 0;
  const tracked = await runGit(".", "ls-files", "-z");
  return tracked.split("\0").filter((path) => path !== "");
}
async function readProject() {
  const tracked = await listTrackedPaths();
  if (tracked === void 0) return void 0;
  return summarizeSources(
    listSourceFiles(tracked).flatMap((path) => {
      const text = readFile(path);
      return text === void 0 ? [] : [{ path, text }];
    })
  );
}
async function reportKinds(...kinds) {
  const summary = await loadSummary();
  return summary === void 0 ? { ok: true } : buildKindReport(summary, kinds);
}
async function skipUnlessProjectIsAccountable() {
  if (discoverWorkspaces().some((workspace) => workspace.name === PACKAGE_NAME)) return SELF;
  const summary = await loadSummary();
  if (summary === void 0) return NOT_A_REPO;
  return summary.sourceCount === 0 ? NO_SOURCES : false;
}
export {
  default_default as default
};
