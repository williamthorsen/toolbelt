#!/usr/bin/env node
import fs from 'node:fs';

import { createKeychainStore } from '../3-candidate/createKeychainStore.ts';
import { runSecurityInteractively } from '../internal/runSecurity.ts';
import { buildSetArgs } from '../internal/securityCommands.ts';
import { resolveSelfVersion } from './resolveSelfVersion.ts';
import { runTbSecret } from './runTbSecret.ts';

const STDIN_FD = 0;

const { exitCode, stderr, stdout } = runTbSecret(process.argv.slice(2), {
  createStore: (keychain) => (keychain === undefined ? createKeychainStore() : createKeychainStore({ keychain })),
  createWritableStore: () => createKeychainStore(),
  isStdinTty: () => process.stdin.isTTY,
  promptSecret: (query) => runSecurityInteractively(buildSetArgs(query)),
  readStdin: () => fs.readFileSync(STDIN_FD, 'utf8'),
  resolveVersion: () => resolveSelfVersion(),
});

if (stdout !== '') process.stdout.write(stdout);
if (stderr !== '') process.stderr.write(stderr);

process.exitCode = exitCode;
