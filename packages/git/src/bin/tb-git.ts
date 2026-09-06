import { resolveCheckedOutBranch } from './resolveCheckedOutBranch.ts';
import { resolveSelfVersion } from './resolveSelfVersion.ts';
import { runTbGit } from './runTbGit.ts';

// A reader that exits first closes the pipe, which node surfaces as an error event rather than the quiet
// termination that SIGPIPE would give.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code !== 'EPIPE') throw error;
  });
}

const { exitCode, stderr, stdout } = runTbGit(process.argv.slice(2), {
  resolveBranch: resolveCheckedOutBranch,
  resolveVersion: resolveSelfVersion,
});

if (stdout !== '') process.stdout.write(stdout);
if (stderr !== '') process.stderr.write(stderr);

process.exitCode = exitCode;
