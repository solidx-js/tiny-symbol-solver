import { Solver } from '../src/Solver';
import { Expression } from '../src/Expression';
import { Symbol } from '../src/Symbol';

/**
 * 构造一个菱形依赖
 * a
 * | \
 * b  c
 * | \| \
 * d  e  f
 */
function setExpSet1(solver: Solver) {
  solver.define('a = 1');
  solver.define('b = a + 1');
  solver.define('c = a + 2');
  solver.define('d = b + 3');
  solver.define('e = b + c');
  solver.define('f = c + 4');
}

describe('Expression', () => {
  it('a = 1 + 2', () => {
    const exp = new Expression('a = 1 + 2');
    expect(exp.target).toEqual('a');
    expect(exp.deps).toEqual([]);
  });

  it('ret = a + (b * c) + 1', () => {
    const exp = new Expression('ret = a + (b * c) + 1');
    expect(exp.target).toEqual('ret');
    expect(exp.deps).toEqual(['a', 'b', 'c']);
  });

  it('evaluate', () => {
    const exp = new Expression('ret = a + (b * c) + 1');

    const s_ret = Symbol.of('ret', 0);
    const s_a = Symbol.of('a', 1);
    const s_b = Symbol.of('b', 2);
    const s_c = Symbol.of('c', 3);

    const symbols = new Map<string, Symbol>([
      ['ret', s_ret],
      ['a', s_a],
      ['b', s_b],
      ['c', s_c],
    ]);
    exp.evaluate(symbols);
    expect(s_ret.value).toEqual(8);

    s_a.value = 2;
    exp.evaluate(symbols);
    expect(s_ret.value).toEqual(9);
  });

  it('macro', () => {
    const exp = new Expression('add(a, b) = a + b + PI + add2(a, b)');
    expect(exp.target).toEqual('add');
    expect(exp.deps).toEqual(['PI', 'add2']);
    expect(exp.privateSymbols).toEqual(['a', 'b']);
  });
});

describe('Solver', () => {
  it('deps & effects', () => {
    const solver = new Solver();

    setExpSet1(solver);

    const deps: Record<string, string[]> = {};
    const effects: Record<string, string[]> = {};

    for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) {
      deps[key] = Array.from(solver.deps(key)).sort();
      effects[key] = Array.from(solver.effects(key)).sort();
    }

    expect(deps).toEqual({
      a: [],
      b: ['a'],
      c: ['a'],
      d: ['a', 'b'],
      e: ['a', 'b', 'c'],
      f: ['a', 'c'],
    });

    expect(effects).toEqual({
      a: ['b', 'c', 'd', 'e', 'f'],
      b: ['d', 'e'],
      c: ['e', 'f'],
      d: [],
      e: [],
      f: [],
    });
  });

  it('constant', () => {
    const solver = new Solver();
    setExpSet1(solver);

    const rets: Record<string, number> = {};
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) {
      rets[key] = solver.solve(key);
    }
    expect(rets).toEqual({ a: 1, b: 2, c: 3, d: 5, e: 5, f: 7 });

    // 修改 a 的值
    solver.define('a = 2');
    const rets2: Record<string, number> = {};
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) {
      rets2[key] = solver.solve(key);
    }

    expect(rets2).toEqual({ a: 2, b: 3, c: 4, d: 6, e: 7, f: 8 });
  });

  it('lazy set symbol', () => {
    const solver = new Solver();
    const resolveKeys: string[] = [];

    solver.events.listen('solve', ev => {
      resolveKeys.push(ev.sym);
    });

    solver.define('a = b + 1');
    expect(solver.solve('a')).toBe(NaN);

    solver.define('b = 1');
    expect(solver.solve('a')).toBe(2);

    expect(resolveKeys).toEqual(['a', 'b', 'a']);
  });

  it('macos', () => {
    const solver = new Solver();

    solver.define('add(a, b) = PI + a + b');
    solver.define('add2(x) = add(x, 1) * add(x, 2)');

    solver.define('PI = 3');
    solver.define('a = add2(1)');

    expect(solver.solve('a')).toEqual(30);
    expect(typeof solver.solve('add')).toEqual('function');
    expect(typeof solver.solve('add2')).toEqual('function');
  });

  it('native macro', () => {
    const solver = new Solver();

    solver.define('add', (a: number, b: number) => a + b);
    solver.define('a = add(1, 2)');

    expect(solver.solve('a')).toEqual(3);
  });
});
