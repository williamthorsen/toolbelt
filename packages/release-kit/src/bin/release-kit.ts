#!/usr/bin/env node
/* eslint n/hashbang: off, n/no-process-exit: off */
/* eslint unicorn/no-process-exit: off */

import { initCommand } from '../init/initCommand.ts';

function showUsage(): void {
  console.info(`
Usage: release-kit <command> [options]

Commands:
  init          Initialize release-kit in the current repository

Options:
  --dry-run     Preview changes without writing files
  --help, -h    Show this help message
`);
}

function showInitHelp(): void {
  console.info(`
Usage: release-kit init [options]

Initialize release-kit in the current repository.
Scaffolds workflow, scripts, and config files.

Options:
  --dry-run     Preview changes without writing files
  --help, -h    Show this help message
`);
}

const args = process.argv.slice(2);
const command = args[0];
const flags = args.slice(1);

if (command === '--help' || command === '-h' || command === undefined) {
  showUsage();
  process.exit(0);
}

if (command === 'init') {
  if (flags.some((f) => f === '--help' || f === '-h')) {
    showInitHelp();
    process.exit(0);
  }

  const unknownFlags = flags.filter((f) => f !== '--dry-run');
  if (unknownFlags.length > 0) {
    console.error(`Error: Unknown option: ${unknownFlags[0]}`);
    process.exit(1);
  }

  const dryRun = flags.includes('--dry-run');
  const exitCode = await initCommand({ dryRun });
  process.exit(exitCode);
}

console.error(`Error: Unknown command: ${command}`);
showUsage();
process.exit(1);
