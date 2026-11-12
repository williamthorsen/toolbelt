import { createServer } from 'node:net';

import { installCrashHandler } from '../../../installCrashHandler.ts';

installCrashHandler('demo');
// Keep the event loop alive, so that only the handler's exit ends the process.
createServer().listen(0);
setTimeout(() => {
  throw new Error('listener failure');
}, 0);
