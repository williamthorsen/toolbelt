/* eslint n/no-process-exit: off */
/* eslint unicorn/no-process-exit: off */
import { execSync } from 'node:child_process';
import process from 'node:process';

const OK_CODE = 0;
const ERROR_CODE = 1;

const args = process.argv.slice(2);

if (args.includes('-?') || args.includes('--help')) {
  showHelp(OK_CODE);
}

const dryRun = args.includes('--dry-run');
const noGitChecks = args.includes('--no-git-checks');
const filterValue = getFlag('--filter');
const filters = filterValue ? parseFilters(filterValue) : [];

const publishFlags = [...(dryRun ? ['--dry-run'] : []), ...(noGitChecks ? ['--no-git-checks'] : [])];

run();

// -- Main --------------------------------------------------------------------

function run(): void {
  clean();
  build();
  publish(filters, publishFlags);
}

function clean(): void {
  console.info('Cleaning dist/ directories...');
  exec('pnpm run clean');
}

function build(): void {
  console.info('Building all packages...');
  exec('pnpm run build');
}

function publish(filters: string[], flags: string[]): void {
  const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';

  if (filters.length === 0) {
    console.info('Publishing all packages...');
    exec(`pnpm publish --recursive${flagStr}`);
  } else {
    for (const name of filters) {
      console.info(`Publishing ${name}...`);
      exec(`pnpm --filter ${name} publish${flagStr}`);
    }
  }
}

// -- Helpers -----------------------------------------------------------------

function exec(command: string): void {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch {
    process.exit(ERROR_CODE);
  }
}

function getFlag(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${name}`);
    process.exit(ERROR_CODE);
  }
  return value;
}

function parseFilters(value: string): string[] {
  return value.split(',').map(normalizePackageName);
}

function normalizePackageName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.startsWith('@')) return trimmed;
  return `@williamthorsen/toolbelt.${trimmed}`;
}

function showHelp(code: number): never {
  console.info('Usage: pnpm run publish:local [options]');
  console.info('');
  console.info('Clean, build, and publish packages to the registry.');
  console.info('');
  console.info('Options:');
  console.info('  --filter <names>   Comma-separated package names to publish');
  console.info('                     (short: arrays, or full: @williamthorsen/toolbelt.arrays)');
  console.info('  --dry-run          Forwarded to pnpm publish');
  console.info('  --no-git-checks    Forwarded to pnpm publish');
  console.info('  --help, -?         Show this help');
  process.exit(code);
}
