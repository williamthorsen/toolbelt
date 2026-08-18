/** @noformat — @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.29.0";


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
  discoverWorkspaces,
  readTrackedSources
} from "readyup/check-utils";
var NOT_A_REPO = "the project is not a git working tree, and these checks read the files git tracks";
var SELF = "this project publishes the package these checks are for";
function defineAdoptionKit(spec) {
  const cache = {};
  return defineRdyKit({
    description: spec.description,
    defaultSeverity: "warn",
    checklists: [
      {
        name: "adoption",
        checks: spec.checks.map((check) => ({
          name: check.name,
          ...check.severity !== void 0 && { severity: check.severity },
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds(check.kinds),
          fix: check.fix
        }))
      }
    ]
  });
  function loadSummary() {
    cache.summary ??= readProject();
    return cache.summary;
  }
  async function readProject() {
    const sources = await readTrackedSources(spec.pathFilter);
    if (sources === void 0) return void 0;
    return {
      adoptedCount: countPackageUsage(sources, {
        exportNames: spec.exportNames,
        packageName: spec.packageName
      }),
      findings: sources.flatMap((source) => spec.detect(source.text).map((site) => ({ ...site, path: source.path }))),
      sourceCount: sources.length
    };
  }
  async function reportKinds(kinds) {
    const summary = await loadSummary();
    if (summary === void 0) return { ok: true };
    return buildFindingReport({
      adoptedCount: summary.adoptedCount,
      findings: summary.findings,
      shouldReport: (finding) => kinds.includes(finding.kind)
    });
  }
  async function skipUnlessProjectIsAccountable() {
    if (discoverWorkspaces().some((workspace) => workspace.name === spec.packageName)) return SELF;
    const summary = await loadSummary();
    if (summary === void 0) return NOT_A_REPO;
    return summary.sourceCount === 0 ? spec.noSourcesReason : false;
  }
}

// ../adoption/src/portable/blankNonCode.ts
var REGEX_PRECEDERS = /* @__PURE__ */ new Set([
  "!",
  "%",
  "&",
  "(",
  "*",
  "+",
  ",",
  "-",
  ":",
  ";",
  "<",
  "=",
  ">",
  "?",
  "[",
  "^",
  "{",
  "|",
  "~"
]);
var EXPRESSION_KEYWORDS = /* @__PURE__ */ new Set([
  "await",
  "case",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "typeof",
  "void",
  "yield"
]);
var WORD_CHAR = /[\w$]/;
function blankNonCode(source) {
  const scan = { out: source.split(""), source };
  const start = source.startsWith("#!") ? blankSpan(scan, 0, findLineEnd(source, 0)) : 0;
  scanCode(scan, start, false);
  return scan.out.join("");
}
function blankQuoted(scan, start, quote) {
  const { source } = scan;
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "\n") break;
    if (char === quote) return blankSpan(scan, start + 1, index) + 1;
    index += 1;
  }
  return start + 1;
}
function blankSpan(scan, from, to) {
  for (let index = from; index < to; index += 1) {
    const char = scan.source[index];
    if (char !== "\n" && char !== "\r") scan.out[index] = " ";
  }
  return to;
}
function blankTemplate(scan, start) {
  const { source } = scan;
  let index = start + 1;
  let textStart = index;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "`") return blankSpan(scan, textStart, index) + 1;
    if (char === "$" && source[index + 1] === "{") {
      blankSpan(scan, textStart, index);
      const close = scanCode(scan, index + 2, true);
      index = close < source.length ? close + 1 : close;
      textStart = index;
      continue;
    }
    index += 1;
  }
  return blankSpan(scan, textStart, source.length);
}
function findBlockCommentEnd(source, from) {
  const end = source.indexOf("*/", from + 2);
  return end === -1 ? source.length : end + 2;
}
function findLineEnd(source, from) {
  const end = source.indexOf("\n", from);
  return end === -1 ? source.length : end;
}
function findRegexEnd(source, start) {
  let index = start + 1;
  let isInClass = false;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "\n") return void 0;
    if (char === "[") isInClass = true;
    else if (char === "]") isInClass = false;
    else if (char === "/" && !isInClass) return index + 1;
    index += 1;
  }
  return void 0;
}
function findWordEnd(source, from) {
  let index = from;
  while (index < source.length && WORD_CHAR.test(source[index] ?? "")) index += 1;
  return index;
}
function scanCode(scan, from, isInterpolation) {
  const { source } = scan;
  let previousToken = "";
  let braceDepth = 0;
  let index = from;
  while (index < source.length) {
    const char = source[index] ?? "";
    const next = source[index + 1];
    if (char === "/" && next === "/") {
      index = blankSpan(scan, index, findLineEnd(source, index));
      continue;
    }
    if (char === "/" && next === "*") {
      index = blankSpan(scan, index, findBlockCommentEnd(source, index));
      continue;
    }
    if (char === "'" || char === '"') {
      index = blankQuoted(scan, index, char);
      previousToken = char;
      continue;
    }
    if (char === "`") {
      index = blankTemplate(scan, index);
      previousToken = char;
      continue;
    }
    if (char === "/" && startsRegex(previousToken)) {
      const end = findRegexEnd(source, index);
      if (end !== void 0) {
        blankSpan(scan, index + 1, end - 1);
        index = end;
        previousToken = "/";
        continue;
      }
    }
    if (isInterpolation && char === "{") braceDepth += 1;
    else if (isInterpolation && char === "}") {
      if (braceDepth === 0) return index;
      braceDepth -= 1;
    }
    if (WORD_CHAR.test(char)) {
      const end = findWordEnd(source, index);
      previousToken = source.slice(index, end);
      index = end;
      continue;
    }
    if (!/\s/.test(char)) previousToken = char;
    index += 1;
  }
  return index;
}
function startsRegex(previousToken) {
  if (previousToken === "") return true;
  if (previousToken.length === 1) return REGEX_PRECEDERS.has(previousToken);
  return EXPRESSION_KEYWORDS.has(previousToken);
}

// ../adoption/src/portable/getLineAtOffset.ts
function getLineAtOffset(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\n") line += 1;
  }
  return line;
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

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = [
  "disposeOnTestFinished",
  "makeFixture",
  "silenceConsole",
  "throwOnProcessExit"
];

// src/readiness/classifyExitMock.ts
var IMPLEMENTATION = /^\s*\.mockImplementation(?:Once)?\(/;
var THROWN_CLASS = /throw new (\w+)\(/;
var BARE_REFERENCE = /^[\w$.]+$/;
function classifyExitMock(after, source) {
  if (!IMPLEMENTATION.test(after)) return { kind: "unclassified" };
  const group = readBalancedGroup(after, 0, PARENTHESES);
  if (group === void 0) return { kind: "unclassified" };
  const body = after.slice(group.start + 1, group.end - 1);
  const symbol = THROWN_CLASS.exec(body)?.[1];
  if (symbol !== void 0) {
    const declared = new RegExp(String.raw`\bclass ${symbol}\b[^\n]*\bextends\b`);
    return declared.test(source) ? { kind: "sentinel-clone", symbol } : { kind: "throwing" };
  }
  if (/\bthrow\b/.test(body)) return { kind: "throwing" };
  return { kind: BARE_REFERENCE.test(body.trim()) ? "unclassified" : "non-throwing" };
}

// src/readiness/listExitMocks.ts
var SPY = /\bvi\s*\.\s*spyOn\(\s*process\s*,\s*(['"])exit\1\s*\)/g;
function listExitMocks(source) {
  const code = blankNonCode(source);
  const mocks = [];
  for (const match of source.matchAll(SPY)) {
    if (code[match.index] !== source[match.index]) continue;
    const after = code.slice(match.index + match[0].length);
    mocks.push({ ...classifyExitMock(after, code), line: getLineAtOffset(code, match.index) });
  }
  return mocks;
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.vitest";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/vitest#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listExitMocks,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no test files",
  packageName: PACKAGE_NAME,
  // The selection inverts the one `toolbelt.errors` makes, which exempts tests. A `process.exit` mock exists
  // only in a test, so a sweep that skipped tests would report nothing and say so as a pass.
  pathFilter: isTestFile,
  checks: [
    {
      name: "No test declares its own process-exit sentinel error",
      kinds: ["sentinel-clone"],
      fix: `Delete the class named above and use throwOnProcessExit from ${PACKAGE_NAME}/candidate, whose ProcessExitError carries the code. One substitution retires the class and the mock together. Reference: ${README_URL}`
    },
    {
      name: "No test mocks process.exit without throwing",
      kinds: ["non-throwing"],
      fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate. A mock that returns lets execution continue past the exit, so the test asserts against a path the process never reaches, and nothing reports it.`
    },
    {
      name: "No test hand-rolls a throwing or unreadable process-exit mock",
      kinds: ["throwing", "unclassified"],
      severity: "recommend",
      fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate, and assert the code on the thrown ProcessExitError. An unclassified mock is one these checks could not read: an implementation given as a bare reference, attached away from the spy's own call chain, or whose parentheses never balance.`
    }
  ]
});
export {
  default_default as default
};
