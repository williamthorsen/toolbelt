import { installCrashHandler } from '../../../installCrashHandler.ts';

installCrashHandler('demo');
// eslint-disable-next-line @typescript-eslint/only-throw-error -- the fixture exercises a thrown value that is not an `Error`.
throw { code: 7 };
