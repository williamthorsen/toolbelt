import { installCrashHandler } from '../../../installCrashHandler.ts';

installCrashHandler('demo');
// Exceed a pipe's 64 KiB buffer, which an exit before the write flushes would truncate.
throw new Error(`${'x'.repeat(100_000)}END-OF-MESSAGE`);
