import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';

import { findPackageManagerPin } from '../3-candidate/findPackageManagerPin.ts';
import { listStrandedAsdfShims } from '../3-candidate/listStrandedAsdfShims.ts';
import { resolvePnpmProvider } from './resolvePnpmProvider.ts';
import { resolveSelfVersion } from './resolveSelfVersion.ts';
import { runPnpmVersion } from './runPnpmVersion.ts';
import { runTbNode } from './runTbNode.ts';

// A reader that exits first closes the pipe, which node emits as an error event rather than the quiet
// termination that SIGPIPE would give.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code !== 'EPIPE') throw error;
  });
}

process.exitCode = await runTbNode(
  process.argv.slice(2),
  {
    cwd: process.cwd(),
    execPath: process.execPath,
    findPin: findPackageManagerPin,
    homeDir: os.homedir(),
    isStdinTty: () => process.stdin.isTTY,
    listStrandedShims: listStrandedAsdfShims,
    now: Date.now,
    pathDirs: (process.env['PATH'] ?? '').split(path.delimiter),
    readAnswer,
    resolvePnpmProvider,
    resolveVersion: resolveSelfVersion,
    runPnpmVersion,
  },
  { stderr: process.stderr, stdout: process.stdout },
);

// region | Helpers

/** Resolves to the answer to a question, or undefined when the interface rejects it. */
async function askQuietly(reader: readline.Interface, question: string): Promise<string | undefined> {
  try {
    return await reader.question(question);
  } catch {
    return;
  }
}

/** Asks a question on stderr and resolves to the line typed on stdin, or undefined when input ends first. */
async function readAnswer(question: string): Promise<string | undefined> {
  const reader = readline.createInterface({ input: process.stdin, output: process.stderr });
  const closed = new Promise<undefined>((resolve) => {
    reader.once('close', () => {
      resolve(undefined);
    });
  });

  try {
    return await Promise.race([askQuietly(reader, question), closed]);
  } finally {
    reader.close();
  }
}

// endregion | Helpers
