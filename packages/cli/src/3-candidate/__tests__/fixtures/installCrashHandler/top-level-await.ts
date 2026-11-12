import { installCrashHandler } from '../../../installCrashHandler.ts';

installCrashHandler('demo');
await Promise.reject(new Error('top-level rejection'));
