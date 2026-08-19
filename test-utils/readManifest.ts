import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from './isRecord.ts';

/**
 * Reads a workspace's `package.json`, returning its fields for reading by name. Throws where the file is
 * unreadable as JSON or holds anything but a JSON object, so a malformed manifest fails the audit that reads it.
 */
export function readManifest(packageDirectory: string): Record<string, unknown> {
  const manifestPath = path.join(packageDirectory, 'package.json');

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Manifest is not readable as JSON: ${manifestPath}`, { cause: error });
  }

  if (!isRecord(parsed)) {
    throw new Error(`Manifest is not a JSON object: ${manifestPath}`);
  }

  return parsed;
}
