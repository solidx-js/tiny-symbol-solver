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
  solver.set('a = 1');
  solver.set('b = a + 1');
  solver.set('c = a + 2');
  solver.set('d = b + 3');
  solver.set('e = b + c');
  solver.set('f = c + 4');
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

    const s_ret = new Symbol('ret', 0);
    const s_a = new Symbol('a', 1);
    const s_b = new Symbol('b', 2);
    const s_c = new Symbol('c', 3);

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
      rets[key] = solver.evaluate(key);
    }
    expect(rets).toEqual({ a: 1, b: 2, c: 3, d: 5, e: 5, f: 7 });

    // 修改 a 的值
    solver.set('a = 2');
    const rets2: Record<string, number> = {};
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f']) {
      rets2[key] = solver.evaluate(key);
    }

    expect(rets2).toEqual({ a: 2, b: 3, c: 4, d: 6, e: 7, f: 8 });
  });

  it('lazy set symbol', () => {
    const solver = new Solver();
    const resolveKeys: string[] = [];

    solver.events.listen('resolve', ev => {
      resolveKeys.push(ev.sym);
    });

    solver.set('a = b + 1');
    expect(solver.evaluate('a')).toBe(NaN);

    solver.set('b = 1');
    expect(solver.evaluate('a')).toBe(2);

    expect(resolveKeys).toEqual(['a', 'b', 'a']);
  });
});
