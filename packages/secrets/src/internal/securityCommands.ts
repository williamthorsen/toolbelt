import type { SecretQuery } from '../3-candidate/SecretStore.ts';
import { UnstorableSecretError } from './UnstorableSecretError.ts';

// `security -i` reads a command into a 4,096-byte buffer that the terminating newline occupies one byte of.
const MAX_LINE_BYTES = 4_095;

const HEX_CHARACTERS_PER_BYTE = 2;
const LINE_BREAK_PATTERN = /[\n\r]/;

/**
 * Builds the arguments that delete a secret.
 *
 * @internal
 */
export function buildDeleteArgs(query: SecretQuery, keychain?: string): string[] {
  return ['delete-generic-password', ...itemArgs(query), ...keychainArgs(keychain)];
}

/**
 * Builds the arguments that read a secret. `-g` is what prints it, in the two forms that
 * `parseSecurityPassword` reads.
 *
 * @internal
 */
export function buildFindArgs(query: SecretQuery, keychain?: string): string[] {
  return ['find-generic-password', ...itemArgs(query), '-g', ...keychainArgs(keychain)];
}

/**
 * Builds the arguments that report whether a secret is stored. Without `-g` the command reads the item's
 * attributes alone, so it never retrieves the secret and cannot raise a keychain access prompt.
 *
 * @internal
 */
export function buildHasArgs(query: SecretQuery, keychain?: string): string[] {
  return ['find-generic-password', ...itemArgs(query), ...keychainArgs(keychain)];
}

/**
 * Composes the one command line that `security -i` runs to store a secret. Interactive mode takes the whole
 * command on stdin, which keeps the secret off argv, where any local process could read it, and away from the
 * 128-byte buffer that `security` fills when `-w` carries no value.
 *
 * The secret goes in as `-X <hex>`. Its alphabet is closed, so no secret can alter the line's structure, and
 * every byte sequence is representable, a line break included. The service, account, and keychain have no such
 * form, so they are quoted instead and a line break in one is refused.
 *
 * @internal
 */
export function composeSetLine(query: SecretQuery, secret: string, keychain?: string): string {
  const { account = '', service } = query;

  assertOneLine(account, 'account');
  assertOneLine(service, 'service');
  if (keychain !== undefined) assertOneLine(keychain, 'keychain');

  const head = `add-generic-password -U -a ${quote(account)} -s ${quote(service)} -X`;
  const tail = keychain === undefined ? '' : ` ${quote(keychain)}`;
  const line = `${head} ${encodeHex(secret)}${tail}`;

  assertLineFits(line, Buffer.byteLength(`${head} ${tail}`, 'utf8'));

  return line;
}

// region | Helpers

/** Refuses a line that `security -i` would cut, which it does by reading the overflow as its next command. */
function assertLineFits(line: string, fixedBytes: number): void {
  const lineBytes = Buffer.byteLength(line, 'utf8');
  if (lineBytes <= MAX_LINE_BYTES) return;

  const availableBytes = Math.floor((MAX_LINE_BYTES - fixedBytes) / HEX_CHARACTERS_PER_BYTE);

  throw new UnstorableSecretError(
    `The secret is too long to store. The command line would be ${lineBytes} bytes and \`security\` reads at ` +
      `most ${MAX_LINE_BYTES}. The rest of the command leaves room for a secret of ${availableBytes} bytes.`,
  );
}

/** Refuses a value that cannot sit on a command line, which is any carrying the break that ends one. */
function assertOneLine(value: string, field: string): void {
  if (!LINE_BREAK_PATTERN.test(value)) return;

  throw new UnstorableSecretError(
    `The ${field} carries a line break, which \`security\` reads as the end of a command.`,
  );
}

/** Encodes the secret as the lowercase hexadecimal that `-X` takes. */
function encodeHex(secret: string): string {
  return Buffer.from(secret, 'utf8').toString('hex');
}

/**
 * Names the item to act on. The account is always passed, carrying the empty string where the caller gave
 * none, since a match on the service alone returns an arbitrary one of the items holding it.
 */
function itemArgs({ account = '', service }: SecretQuery): string[] {
  return ['-a', account, '-s', service];
}

/** Names the keychain to act on, or nothing, which leaves `security` to use the default search list. */
function keychainArgs(keychain: string | undefined): string[] {
  return keychain === undefined ? [] : [keychain];
}

/** Wraps a value for the interactive parser, which ends a token at a space and reads `\` as an escape. */
function quote(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`)}"`;
}

// endregion | Helpers
