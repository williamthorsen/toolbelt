#!/usr/bin/env node
import fs from 'node:fs';

import { createKeychainStore, promptSecret } from '@williamthorsen/toolbelt.secrets/candidate';

import { createTokenTransport } from '../3-candidate/createTokenTransport.ts';
import { findSpecPath } from './findSpecPath.ts';
import { resolveSelfVersion } from './resolveSelfVersion.ts';
import { runTbJira } from './runTbJira.ts';

const STDIN_FD = 0;

process.exitCode = await runTbJira(process.argv.slice(2), {
  createRequest: (options) => createTokenTransport(options),
  createStore: () => createKeychainStore(),
  cwd: () => process.cwd(),
  env: process.env,
  fetch,
  findSpecPath: (fromDir) => findSpecPath(fromDir),
  isStdinTty: () => process.stdin.isTTY,
  promptSecret: () => promptSecret(process.stdin, process.stderr),
  readStdin: () => fs.readFileSync(STDIN_FD, 'utf8'),
  readTextFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
  resolveVersion: () => resolveSelfVersion(),
  write: (text) => void process.stdout.write(text),
  writeError: (text) => void process.stderr.write(text),
});
