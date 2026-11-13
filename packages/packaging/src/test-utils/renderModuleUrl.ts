import { pathToFileURL } from 'node:url';

/**
 * Renders the `import.meta.url` that a module at `filePath` would have. The file need not exist: The ascent reads
 * manifests alone, which lets a compiled layout be described without compiling one.
 */
export function renderModuleUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}
