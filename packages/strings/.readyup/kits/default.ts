/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.strings.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest.
 *
 * The checks take inventory rather than banning a pattern. Each is a `recommend`: A hand-rolled capitalization or
 * pluralization, and text laid out to do without `dedent`, is correct code that a published utility expresses
 * better, not a defect. Nothing here is `error`, and nothing is `warn`.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSource, isAdoptableSourceOrTest } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listStringIdioms } from '../../src/readiness/listStringIdioms.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.strings';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/strings#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listStringIdioms,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside the exempt paths',
  packageName: PACKAGE_NAME,
  // A test writes a capitalization or a pluralization deliberately, and a bootstrap wrapper's hand-rolled string
  // handling keeps its build-first message alive through an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: 'No source capitalizes a string by hand',
      id: 'no-hand-rolled-capitalize',
      kinds: ['capitalize-inline'],
      severity: 'recommend',
      fix: `Replace each expression named above with capitalize from ${PACKAGE_NAME}/candidate. From the charAt(0) form the substitution is exact; from the subscript form it is a correction, since indexing an empty string yields undefined and throws, where capitalize returns the empty string. Reference: ${README_URL}`,
    },
    {
      name: 'No source pluralizes a word by hand',
      id: 'no-hand-rolled-pluralize',
      kinds: ['pluralize-inline'],
      severity: 'recommend',
      fix: `Replace each expression named above with pluralize from ${PACKAGE_NAME}, called as pluralize(count, singular) or, for an irregular plural, pluralize(count, singular, plural). It takes the whole word rather than a suffix, so a site splicing an s takes the word too; pluralizeWithCount prints the count alongside. Mind the sign: pluralize tests Math.abs(count), so a count of -1 takes the singular where a hand-rolled equality test takes the plural. Reference: ${README_URL}`,
    },
    {
      name: 'No source joins an array of lines into text',
      id: 'no-joined-line-array',
      kinds: ['joined-line-array'],
      severity: 'recommend',
      fix: `Replace each array named above with a dedent template from ${PACKAGE_NAME}, writing one line of the template for each element, starting on the line after the opening backtick and indented with the surrounding code. A trailing empty element becomes a blank line before the closing backtick. An element holding an escaped line break takes a real one, since dedent rejects an escaped line terminator, and an interpolated value must be a string, number, bigint, or boolean. Reference: ${README_URL}`,
      // A test's fixtures are where most multi-line text is written.
      noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside its bootstrap wrappers',
      pathFilter: isAdoptableSourceOrTest,
    },
    {
      name: 'No source lets a template drop below its indentation',
      id: 'no-layout-breaking-template',
      kinds: ['layout-breaking-template'],
      severity: 'recommend',
      fix: `Tag each template named above with dedent from ${PACKAGE_NAME}, start its text on the line after the opening backtick, and indent the text with the surrounding code, keeping each line's depth relative to the others. Text that starts or ends with a line break takes a blank line after the opening backtick or before the closing one, since dedent drops the line break at each end. dedent throws where text follows the opening backtick on its own line or where the text holds an escaped line terminator, and accepts an interpolated value only where it is a string, number, bigint, or boolean. Reference: ${README_URL}`,
      noSourcesReason: 'the project holds no JavaScript or TypeScript sources outside its bootstrap wrappers',
      pathFilter: isAdoptableSourceOrTest,
    },
  ],
});
