import type { FunctionBody } from './listFunctionBodies.ts';

/**
 * Returns the innermost function whose body contains an offset, if any does.
 *
 * @internal
 */
export function findEnclosingBody(bodies: readonly FunctionBody[], offset: number): FunctionBody | undefined {
  let enclosing: FunctionBody | undefined;
  for (const body of bodies) {
    const contains = body.bodyStart <= offset && offset < body.bodyEnd;
    if (contains && (enclosing === undefined || body.bodyStart > enclosing.bodyStart)) enclosing = body;
  }
  return enclosing;
}
