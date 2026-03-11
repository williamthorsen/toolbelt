import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { RepoType } from './detectRepoType.ts';
import { parseJsonRecord } from './parseJsonRecord.ts';
import { printError, printSkip, printSuccess } from './prompt.ts';
import { releaseConfigScript, releasePrepareScript, releaseWorkflow } from './templates.ts';

interface ScaffoldOptions {
  repoType: RepoType;
  dryRun: boolean;
  overwrite: boolean;
}

interface FileToWrite {
  path: string;
  content: string;
}

/** Attempt to write a file, printing a user-friendly error on failure. Returns true on success. */
function tryWriteFile(filePath: string, content: string): boolean {
  try {
    writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    printError(`Failed to write ${filePath}: ${message}`);
    return false;
  }
}

/** Write a file, creating parent directories as needed. Skips if the file already exists and overwrite is false. */
function writeIfAbsent(filePath: string, content: string, dryRun: boolean, overwrite: boolean): void {
  if (existsSync(filePath) && !overwrite) {
    printSkip(`${filePath} (already exists)`);
    return;
  }

  if (dryRun) {
    printSuccess(`[dry-run] Would create ${filePath}`);
    return;
  }

  try {
    mkdirSync(dirname(filePath), { recursive: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    printError(`Failed to create directory for ${filePath}: ${message}`);
    return;
  }

  if (tryWriteFile(filePath, content)) {
    printSuccess(`Created ${filePath}`);
  }
}

/** Copy the bundled cliff.toml.template to cliff.toml in the target repo. */
export function copyCliffTemplate(dryRun: boolean): void {
  // Resolve the template relative to this file's compiled location.
  // From dist/esm/init/scaffold.js, the template is at ../../../cliff.toml.template.
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const templatePath = resolve(thisDir, '..', '..', '..', 'cliff.toml.template');

  if (!existsSync(templatePath)) {
    printError(`Could not find cliff.toml.template at ${templatePath}`);
    return;
  }

  let content: string;
  try {
    content = readFileSync(templatePath, 'utf8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    printError(`Failed to read cliff.toml.template: ${message}`);
    return;
  }
  writeIfAbsent('cliff.toml', content, dryRun, false);
}

/** Scaffold all release-kit files for the target repo. */
export function scaffoldFiles({ repoType, dryRun, overwrite }: ScaffoldOptions): void {
  const files: FileToWrite[] = [
    { path: '.github/scripts/release-prepare.ts', content: releasePrepareScript() },
    { path: '.github/scripts/release.config.ts', content: releaseConfigScript(repoType) },
    { path: '.github/workflows/release.yaml', content: releaseWorkflow(repoType) },
  ];

  for (const file of files) {
    writeIfAbsent(file.path, file.content, dryRun, overwrite);
  }

  updatePackageJsonScripts(dryRun);
}

/** Read and parse package.json, returning undefined on failure. */
function readPackageJson(pkgPath: string): Record<string, unknown> | undefined {
  let raw: string;
  try {
    raw = readFileSync(pkgPath, 'utf8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    printError(`Failed to read ${pkgPath}: ${message}`);
    return undefined;
  }

  const pkg = parseJsonRecord(raw);
  if (pkg === undefined) {
    printError('Failed to parse package.json');
  }
  return pkg;
}

/** Add release:prepare and release:prepare:dry scripts to package.json if absent. */
function updatePackageJsonScripts(dryRun: boolean): void {
  const pkgPath = 'package.json';

  const pkg = readPackageJson(pkgPath);
  if (pkg === undefined) {
    return;
  }

  const existingScripts = pkg.scripts;
  const scripts: Record<string, unknown> =
    typeof existingScripts === 'object' && existingScripts !== null && !Array.isArray(existingScripts)
      ? { ...existingScripts }
      : {};

  let changed = false;

  if (!('release:prepare' in scripts)) {
    scripts['release:prepare'] = 'tsx .github/scripts/release-prepare.ts';
    changed = true;
  }

  if (!('release:prepare:dry' in scripts)) {
    scripts['release:prepare:dry'] = 'tsx .github/scripts/release-prepare.ts --dry-run';
    changed = true;
  }

  if (!changed) {
    printSuccess('package.json scripts already configured');
    return;
  }

  if (dryRun) {
    printSuccess('[dry-run] Would add release:prepare scripts to package.json');
    return;
  }

  pkg.scripts = scripts;

  if (tryWriteFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)) {
    printSuccess('Added release:prepare scripts to package.json');
  }
}
