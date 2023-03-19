/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

// TODO: Constrain to reflect objects compatible with JSON.
export type JsonObject = Record<string, any>;

export type NonFunction<T> = T extends Function ? never : T;
