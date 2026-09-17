import path from 'node:path';

import { listStrandedAsdfShims } from '../3-candidate/listStrandedAsdfShims.ts';
import { resolveSelfVersion } from './resolveSelfVersion.ts';
import { runTbNode } from './runTbNode.ts';

// A reader that exits first closes the pipe, which node surfaces as an error event rather than the quiet
// termination that SIGPIPE would give.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code !== 'EPIPE') throw error;
  });
}

const { exitCode, stderr, stdout } = runTbNode(process.argv.slice(2), {
  execPath: process.execPath,
  listStrandedShims: listStrandedAsdfShims,
  pathDirs: (process.env['PATH'] ?? '').split(path.delimiter),
  resolveVersion: resolveSelfVersion,
});

if (stdout !== '') process.stdout.write(stdout);
if (stderr !== '') process.stderr.write(stderr);

process.exitCode = exitCode;
