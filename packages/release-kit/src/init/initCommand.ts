import type { CheckResult } from './checks.ts';
import { hasCliffToml, hasPackageJson, isGitRepo, notAlreadyInitialized, usesPnpm } from './checks.ts';
import { detectRepoType } from './detectRepoType.ts';
import { confirm, printError, printStep, printSuccess } from './prompt.ts';
import { copyCliffTemplate, scaffoldFiles } from './scaffold.ts';

interface InitOptions {
  dryRun: boolean;
}

/** Run a required check and print the result. Returns false if the check failed. */
function runRequiredCheck(label: string, result: CheckResult): boolean {
  if (result.ok) {
    printSuccess(label);
    return true;
  }
  printError(result.message ?? `${label} failed`);
  return false;
}

/** Run all eligibility checks. Returns `'pass'`, `'abort'`, or `'fail'`. */
async function checkEligibility(dryRun: boolean): Promise<'pass' | 'abort' | 'fail'> {
  printStep('Checking eligibility');

  if (!runRequiredCheck('Git repository detected', isGitRepo())) return 'fail';
  if (!runRequiredCheck('package.json found', hasPackageJson())) return 'fail';
  if (!runRequiredCheck('pnpm detected', usesPnpm())) return 'fail';

  const cliffCheck = hasCliffToml();
  if (cliffCheck.ok) {
    printSuccess('cliff.toml found');
  } else {
    console.info('');
    const shouldCreate = await confirm('No cliff.toml found. Create one from the bundled template?');
    if (shouldCreate) {
      copyCliffTemplate(dryRun);
    } else {
      printError('cliff.toml is required for changelog generation. Aborting.');
      return 'fail';
    }
  }

  const initCheck = notAlreadyInitialized();
  if (!initCheck.ok) {
    console.info('');
    const shouldOverwrite = await confirm('release-kit appears to be already initialized. Overwrite existing files?');
    if (!shouldOverwrite) {
      console.info('Aborting.');
      return 'abort';
    }
  }

  return 'pass';
}

/**
 * Run the `release-kit init` command.
 *
 * Checks eligibility, detects repo type, scaffolds files, and prints next steps.
 * Returns the process exit code (0 for success, 1 for failure).
 */
export async function initCommand({ dryRun }: InitOptions): Promise<number> {
  if (dryRun) {
    console.info('[dry-run mode]');
  }

  const eligibility = await checkEligibility(dryRun);
  if (eligibility === 'fail') return 1;
  if (eligibility === 'abort') return 0;

  // Detect repo type
  printStep('Detecting repo type');
  const repoType = detectRepoType();
  printSuccess(`Detected: ${repoType}`);

  // Scaffold files
  printStep('Scaffolding files');
  scaffoldFiles({ repoType, dryRun });

  // Print next steps
  printStep('Next steps');
  console.info(`
  1. Customize .github/scripts/release.config.ts for your project
  2. Set the correct node-version and pnpm-version in .github/workflows/release.yaml
  3. Install required dev dependencies: pnpm add --save-dev tsx @williamthorsen/release-kit
  4. Install git-cliff if not already installed: https://git-cliff.org/docs/installation
  5. Create an initial version tag (e.g., git tag v0.0.0)
  6. Test with a dry run: pnpm run release:prepare:dry
`);

  return 0;
}
