/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.36.0";


// ../adoption/src/conventions/path-predicates.ts
var BIN_DIRECTORY = /(?:^|\/)bin\//;
var JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
var TEST_DIRECTORY = /(?:^|\/)__tests__\//;
var TEST_SUFFIX = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
function isAdoptableSource(path) {
  return isJsTsSource(path) && !isBinWrapper(path) && !isTestFile(path) && !isInTestDirectory(path);
}
function isAdoptableSourceOrTest(path) {
  return isJsTsSource(path) && (!isBinWrapper(path) || isTestFile(path) || isInTestDirectory(path));
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

// ../adoption/src/conventions/site-handoffs.ts
var SUBSCRIPT_TAIL = /(?<token>[\w$]+|[)\]'"`])\s?(?:\?\.)?\s?\[\s?$/;
var EXPRESSION_KEYWORDS = /* @__PURE__ */ new Set([
  "await",
  "case",
  "delete",
  "in",
  "new",
  "of",
  "return",
  "typeof",
  "void",
  "yield"
]);
function isArraySubscript(before) {
  const token = SUBSCRIPT_TAIL.exec(before)?.groups?.["token"];
  return token !== void 0 && !EXPRESSION_KEYWORDS.has(token);
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

// ../adoption/src/portable/readLiteral.ts
function readLiteral(source, span) {
  const start = span?.[0];
  const end = span?.[1];
  return start === void 0 || end === void 0 ? void 0 : source.slice(start + 1, end - 1);
}

// ../adoption/src/portable/listTemplateLiterals.ts
var EXPRESSION_KEYWORDS2 = /* @__PURE__ */ new Set([
  "await",
  "case",
  "default",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield"
]);
var WORD_CHARACTER = /[\w$]/;
function listTemplateLiterals(code) {
  const templates = [];
  scanCode(0, false);
  return templates.toSorted((a, b) => a.start - b.start);
  function scanCode(from, isInterpolation) {
    let braceDepth = 0;
    let index = from;
    while (index < code.length) {
      const character = code[index];
      if (character === "`") {
        const end = scanTemplate(index);
        if (end === void 0) return code.length;
        index = end;
        continue;
      }
      if (isInterpolation && character === "{") braceDepth += 1;
      if (isInterpolation && character === "}") {
        if (braceDepth === 0) return index;
        braceDepth -= 1;
      }
      index += 1;
    }
    return code.length;
  }
  function scanTemplate(start) {
    const interpolations = [];
    let index = start + 1;
    while (index < code.length) {
      if (code[index] === "`") {
        templates.push({ end: index + 1, interpolations, isTagged: isTagPosition(code, start), start });
        return index + 1;
      }
      if (code[index] === "$" && code[index + 1] === "{") {
        const close = scanCode(index + 2, true);
        if (close === code.length) return void 0;
        interpolations.push({ end: close + 1, start: index });
        index = close + 1;
        continue;
      }
      index += 1;
    }
    return void 0;
  }
}
function findPrecedingCodeEnd(code, offset) {
  let end = offset;
  while (end > 0 && /\s/.test(code[end - 1] ?? "")) end -= 1;
  return end;
}
function findTypeArgumentsStart(code, close) {
  let depth = 0;
  for (let index = close; index >= 0; index -= 1) {
    if (code[index] === ">") depth += 1;
    if (code[index] === "<") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return void 0;
}
function isTagPosition(code, offset) {
  const end = findPrecedingCodeEnd(code, offset);
  const character = code[end - 1];
  if (character === void 0) return false;
  if (character === ")" || character === "]") return true;
  if (character === ">" && code[end - 2] !== "=") {
    const typeArgumentsStart = findTypeArgumentsStart(code, end - 1);
    return typeArgumentsStart !== void 0 && isTagPosition(code, typeArgumentsStart);
  }
  if (!WORD_CHARACTER.test(character)) return false;
  let wordStart = end;
  while (wordStart > 0 && WORD_CHARACTER.test(code[wordStart - 1] ?? "")) wordStart -= 1;
  const isMemberName = code[findPrecedingCodeEnd(code, wordStart) - 1] === ".";
  return isMemberName || !EXPRESSION_KEYWORDS2.has(code.slice(wordStart, end));
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

// src/readiness/listJoinedLineArrays.ts
var JOIN_TAIL = /\]\s*\.join\(\s*(?<separator>'[^'\n]*'|"[^"\n]*")\s*\)/dg;
var BLANK_TEXT = /^[\t ]*$/;
var CLOSING_DELIMITERS = /* @__PURE__ */ new Set([")", "]", "}"]);
var INDENT = /^[\t ]*/;
var QUOTED_ELEMENT = /^(?:'[^'\n]*'|"[^"\n]*")$/;
var NEWLINE_ESCAPE = String.raw`\n`;
var OPENING_DELIMITERS = /* @__PURE__ */ new Set(["(", "[", "{"]);
var SUBSCRIPT_LOOKBEHIND = 32;
function listJoinedLineArrays(code, source) {
  const templates = listTemplateLiterals(code);
  const lines = [];
  for (const match of code.matchAll(JOIN_TAIL)) {
    if (readLiteral(source, match.indices?.groups?.["separator"]) !== NEWLINE_ESCAPE) continue;
    const close = match.index;
    const open = findOpeningBracket(code, close);
    if (open === void 0 || getLineAtOffset(code, open) === getLineAtOffset(code, close)) continue;
    if (isArraySubscript(readAnchoredWindow(code, open + 1, { lookahead: 0, lookbehind: SUBSCRIPT_LOOKBEHIND }).before)) {
      continue;
    }
    const elements = listElementSpans(code, open, close);
    if (elements === void 0 || elements.length < 2) continue;
    const leadingTexts = [];
    for (const element of elements) {
      const leadingText = readLeadingText(code, source, element, templates);
      if (leadingText === void 0) break;
      leadingTexts.push(leadingText);
    }
    if (leadingTexts.length < elements.length || findSharedIndent(leadingTexts) !== "") continue;
    lines.push(getLineAtOffset(code, open));
  }
  return lines;
}
function findOpeningBracket(code, close) {
  let depth = 0;
  for (let index = close; index >= 0; index -= 1) {
    if (code[index] === "]") depth += 1;
    if (code[index] === "[") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return void 0;
}
function findSharedIndent(leadingTexts) {
  const indents = leadingTexts.filter((leadingText) => leadingText.hasContent).map((leadingText) => INDENT.exec(leadingText.text)?.[0] ?? "");
  const [first = ""] = indents;
  let length = first.length;
  for (const indent of indents) {
    while (length > 0 && !indent.startsWith(first.slice(0, length))) length -= 1;
  }
  return first.slice(0, length);
}
function listElementSpans(code, open, close) {
  const spans = [];
  let depth = 0;
  let start = open + 1;
  for (let index = open + 1; index <= close; index += 1) {
    const character = code.charAt(index);
    if (OPENING_DELIMITERS.has(character)) depth += 1;
    else if (index < close && CLOSING_DELIMITERS.has(character)) depth -= 1;
    else if (character === "," && depth === 0 || index === close) {
      spans.push(trimSpan(code, start, index));
      start = index + 1;
    }
  }
  const last = spans.at(-1);
  if (last !== void 0 && last.start === last.end) spans.pop();
  return spans.some((span) => span.start === span.end) ? void 0 : spans;
}
function readLeadingText(code, source, element, templates) {
  if (QUOTED_ELEMENT.test(code.slice(element.start, element.end))) {
    const text2 = readLiteral(source, [element.start, element.end]) ?? "";
    return { hasContent: !BLANK_TEXT.test(text2), text: text2 };
  }
  const template = templates.find((candidate) => candidate.start === element.start && candidate.end === element.end);
  if (template === void 0 || template.isTagged) return void 0;
  const text = source.slice(template.start + 1, template.interpolations[0]?.start ?? template.end - 1);
  return { hasContent: template.interpolations.length > 0 || !BLANK_TEXT.test(text), text };
}
function trimSpan(code, start, end) {
  let trimmedStart = start;
  let trimmedEnd = end;
  while (trimmedStart < trimmedEnd && /\s/.test(code[trimmedStart] ?? "")) trimmedStart += 1;
  while (trimmedEnd > trimmedStart && /\s/.test(code[trimmedEnd - 1] ?? "")) trimmedEnd -= 1;
  return { end: trimmedEnd, start: trimmedStart };
}

// src/readiness/listLayoutBreakingTemplates.ts
var BLANK_LINE = /^[\t ]*\r?$/;
var INDENT2 = /^[\t ]*/;
var INLINE_SNAPSHOT_CALL = /InlineSnapshot\(\s*$/;
var INLINE_SNAPSHOT_LOOKBEHIND = 64;
function listLayoutBreakingTemplates(code, source) {
  const lines = [];
  for (const template of listTemplateLiterals(code)) {
    if (template.isTagged || isInlineSnapshotArgument(code, template.start)) continue;
    const openingIndent = INDENT2.exec(source.slice(findLineStart(source, template.start)))?.[0] ?? "";
    if (openingIndent === "") continue;
    const laterIndents = listLaterLineIndents(source, template);
    if (laterIndents.length === 0 || findCommonIndent(laterIndents).startsWith(openingIndent)) continue;
    lines.push(getLineAtOffset(code, template.start));
  }
  return lines;
}
function findCommonIndent(indents) {
  const [first = ""] = indents;
  let length = first.length;
  for (const indent of indents) {
    while (length > 0 && !indent.startsWith(first.slice(0, length))) length -= 1;
  }
  return first.slice(0, length);
}
function findLineStart(source, offset) {
  return source.lastIndexOf("\n", offset - 1) + 1;
}
function isInlineSnapshotArgument(code, start) {
  return INLINE_SNAPSHOT_CALL.test(code.slice(Math.max(0, start - INLINE_SNAPSHOT_LOOKBEHIND), start));
}
function listLaterLineIndents(source, template) {
  const indents = [];
  const textEnd = template.end - 1;
  let newline = source.indexOf("\n", template.start);
  while (newline !== -1 && newline < textEnd) {
    const lineStart = newline + 1;
    const nextNewline = source.indexOf("\n", lineStart);
    const lineText = source.slice(lineStart, nextNewline === -1 || nextNewline > textEnd ? textEnd : nextNewline);
    const isInsideInterpolation = template.interpolations.some(
      (interpolation) => interpolation.start < lineStart && lineStart < interpolation.end
    );
    if (!isInsideInterpolation && !BLANK_LINE.test(lineText)) indents.push(INDENT2.exec(lineText)?.[0] ?? "");
    newline = nextNewline;
  }
  return indents;
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
    ...toSites("joined-line-array", listJoinedLineArrays(code, source)),
    ...toSites("layout-breaking-template", listLayoutBreakingTemplates(code, source)),
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
  // A test writes a capitalization or a pluralization deliberately, and a bootstrap wrapper's hand-rolled string
  // handling keeps its build-first message alive through an incomplete install.
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
    },
    {
      name: "No source joins an array of lines into text",
      id: "no-joined-line-array",
      kinds: ["joined-line-array"],
      severity: "recommend",
      fix: `Replace each array named above with a dedent template from ${PACKAGE_NAME}, writing one line of the template for each element, starting on the line after the opening backtick and indented with the surrounding code. A trailing empty element becomes a blank line before the closing backtick. An element holding an escaped line break takes a real one, since dedent rejects an escaped line terminator, and an interpolated value must be a string, number, bigint, or boolean. Reference: ${README_URL}`,
      // A test's fixtures are where most multi-line text is written.
      noSourcesReason: "the project holds no JavaScript or TypeScript sources outside its bootstrap wrappers",
      pathFilter: isAdoptableSourceOrTest
    },
    {
      name: "No source lets a template drop below its indentation",
      id: "no-layout-breaking-template",
      kinds: ["layout-breaking-template"],
      severity: "recommend",
      fix: `Tag each template named above with dedent from ${PACKAGE_NAME}, start its text on the line after the opening backtick, and indent the text with the surrounding code, keeping each line's depth relative to the others. dedent throws where text follows the opening backtick on its own line or where the text holds an escaped line terminator, and accepts an interpolated value only where it is a string, number, bigint, or boolean. Reference: ${README_URL}`,
      noSourcesReason: "the project holds no JavaScript or TypeScript sources outside its bootstrap wrappers",
      pathFilter: isAdoptableSourceOrTest
    }
  ]
});
export {
  default_default as default
};
