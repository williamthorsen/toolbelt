import { createKeychainStore } from '../3-candidate/createKeychainStore.ts';
import { promptSecret } from '../3-candidate/promptSecret.ts';
import { readStreamText } from './readStreamText.ts';
import { resolveSelfVersion } from './resolveSelfVersion.ts';
import { runTbSecret } from './runTbSecret.ts';

const { exitCode, stderr, stdout } = await runTbSecret(process.argv.slice(2), {
  createStore: (keychain) => (keychain === undefined ? createKeychainStore() : createKeychainStore({ keychain })),
  isStdinTty: () => process.stdin.isTTY,
  promptSecret: () => promptSecret(process.stdin, process.stderr),
  readStdin: () => readStreamText(process.stdin),
  resolveVersion: () => resolveSelfVersion(),
});

if (stdout !== '') process.stdout.write(stdout);
if (stderr !== '') process.stderr.write(stderr);

process.exitCode = exitCode;
