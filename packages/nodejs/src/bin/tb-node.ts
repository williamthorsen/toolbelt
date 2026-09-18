import os from 'node:os';
import path from 'node:path';

import { findPackageManagerPin } from '../3-candidate/findPackageManagerPin.ts';
import { listStrandedAsdfShims } from '../3-candidate/listStrandedAsdfShims.ts';
import { resolvePnpmProvider } from './resolvePnpmProvider.ts';
import { resolveSelfVersion } from './resolveSelfVersion.ts';
import { runPnpmVersion } from './runPnpmVersion.ts';
import { runTbNode } from './runTbNode.ts';

// A reader that exits first closes the pipe, which node surfaces as an error event rather than the quiet
// termination that SIGPIPE would give.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code !== 'EPIPE') throw error;
  });
}

const { exitCode, stderr, stdout } = runTbNode(process.argv.slice(2), {
  cwd: process.cwd(),
  execPath: process.execPath,
  findPin: findPackageManagerPin,
  homeDir: os.homedir(),
  listStrandedShims: listStrandedAsdfShims,
  pathDirs: (process.env['PATH'] ?? '').split(path.delimiter),
  resolvePnpmProvider,
  resolveVersion: resolveSelfVersion,
  runPnpmVersion,
});

if (stdout !== '') process.stdout.write(stdout);
if (stderr !== '') process.stderr.write(stderr);

process.exitCode = exitCode;
