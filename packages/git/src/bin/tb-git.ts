#!/usr/bin/env node
import { resolveCheckedOutBranch } from './resolveCheckedOutBranch.ts';
import { resolveSelfVersion } from './resolveSelfVersion.ts';
import { runTbGit } from './runTbGit.ts';

const { exitCode, stderr, stdout } = runTbGit(process.argv.slice(2), {
  resolveBranch: resolveCheckedOutBranch,
  resolveVersion: resolveSelfVersion,
});

if (stdout !== '') process.stdout.write(stdout);
if (stderr !== '') process.stderr.write(stderr);

process.exitCode = exitCode;
