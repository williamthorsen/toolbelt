import { describe, expect, it } from 'vitest';

import { listFunctionBodies } from '../listFunctionBodies.ts';

/** Names each reported function and the body text its offsets span. */
function summarize(source: string): Array<{ body: string; name: string }> {
  return listFunctionBodies(source).map((fn) => ({ body: source.slice(fn.bodyStart, fn.bodyEnd), name: fn.name }));
}

describe(listFunctionBodies, () => {
  it('reports a function declaration', () => {
    expect(summarize('function describe(e) { return e.message; }')).toStrictEqual([
      { body: '{ return e.message; }', name: 'describe' },
    ]);
  });

  it('reports an arrow assigned to a binding', () => {
    expect(summarize('const wrap = (e) => { throw e; };')).toStrictEqual([{ body: '{ throw e; }', name: 'wrap' }]);
  });

  it('reports an async arrow', () => {
    expect(summarize('const load = async (id) => { return read(id); };')).toStrictEqual([
      { body: '{ return read(id); }', name: 'load' },
    ]);
  });

  it('reports each function where a source holds several', () => {
    const source = 'function a() { return 1; }\nfunction b() { return 2; }';

    expect(summarize(source).map((fn) => fn.name)).toStrictEqual(['a', 'b']);
  });

  it('locates the head ahead of the body', () => {
    const source = 'const x = 1;\nfunction later() { return 2; }';
    const [fn] = listFunctionBodies(source);

    expect(source.slice(fn?.headStart)).toMatch(/^function later\(\)/);
  });

  it('spans a body holding nested braces', () => {
    expect(summarize('function f() { if (a) { return 1; } return 2; }')).toStrictEqual([
      { body: '{ if (a) { return 1; } return 2; }', name: 'f' },
    ]);
  });

  it('reports the body of a function whose parameter destructures', () => {
    expect(summarize('function g({ a, b }) { return a + b; }')).toStrictEqual([
      { body: '{ return a + b; }', name: 'g' },
    ]);
  });

  it('reports the body of a function whose parameter defaults to an object', () => {
    expect(summarize('function f(a = { x: 1 }) { return a; }')).toStrictEqual([{ body: '{ return a; }', name: 'f' }]);
  });

  it('reports the body of a function whose parameter carries an inline type literal', () => {
    expect(summarize('function h(a: { x: number }): void { return; }')).toStrictEqual([
      { body: '{ return; }', name: 'h' },
    ]);
  });

  it('reports the body of an arrow whose parameter defaults to an object', () => {
    expect(summarize('const k = (a = { x: 1 }) => { return a; };')).toStrictEqual([
      { body: '{ return a; }', name: 'k' },
    ]);
  });

  it('reports nothing for a function whose parameter list never closes', () => {
    expect(summarize('function broken(a = { x: 1 } { return a; }')).toStrictEqual([]);
  });

  it('reports nothing for an overload signature whose return type carries no brace', () => {
    expect(summarize('declare function f(a: string): void;')).toStrictEqual([]);
  });

  // The next three fix the documented limit: a return-type annotation's brace group wins over the body, because
  // telling a type's braces from a block's takes a parser rather than delimiter counting.
  it('reports the annotation of a function whose return type is an object literal', () => {
    expect(summarize('function r(): { a: number } { return { a: 1 }; }')).toStrictEqual([
      { body: '{ a: number }', name: 'r' },
    ]);
  });

  it('reports the annotation of a function whose return type nests a brace in a generic argument', () => {
    expect(summarize('function s(a: string): Record<string, { x: number }> { return {}; }')).toStrictEqual([
      { body: '{ x: number }', name: 's' },
    ]);
  });

  it('reports a brace-bearing overload signature as though it carried a body', () => {
    expect(summarize('declare function o(): { a: number };')).toStrictEqual([{ body: '{ a: number }', name: 'o' }]);
  });

  it('reports nothing for a concise arrow, which carries no braced body', () => {
    expect(summarize('const m = (e) => e.message;')).toStrictEqual([]);
  });
});
