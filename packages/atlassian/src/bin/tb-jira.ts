#!/usr/bin/env node
import fs from 'node:fs';

import { createKeychainStore, promptSecret } from '@williamthorsen/toolbelt.secrets/candidate';

import { resolveSelfVersion } from './resolveSelfVersion.ts';
import { runTbJira } from './runTbJira.ts';

const STDIN_FD = 0;

process.exitCode = await runTbJira(process.argv.slice(2), {
  createStore: () => createKeychainStore(),
  env: process.env,
  isStdinTty: () => process.stdin.isTTY,
  promptSecret: () => promptSecret(process.stdin, process.stderr),
  readStdin: () => fs.readFileSync(STDIN_FD, 'utf8'),
  resolveVersion: () => resolveSelfVersion(),
  write: (text) => void process.stdout.write(text),
  writeError: (text) => void process.stderr.write(text),
});
