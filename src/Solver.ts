import { Expression } from './Expression';
import { Symbol } from './Symbol';
import { EventBus } from 'ah-event-bus';

export class Solver {
  private _symbols = new Map<string, Symbol>();
  private _expressions = new Map<string, Expression>();
  private _needsUpdate = new Set<string>();

  readonly events = new EventBus<{
    solve: { sym: string };
  }>();

  /** 查找符号的所有依赖 */
  deps(sym: string) {
    const _deps = new Set<string>();

    const _walk = (_cur: string) => {
      _deps.add(_cur);

      const _exp = this._expressions.get(_cur);
      if (!_exp) return;

      for (const _childDep of _exp.deps) {
        _walk(_childDep);
      }
    };

    _walk(sym);
    _deps.delete(sym);

    return _deps;
  }

  /** 查找符号的所有影响 */
  effects(sym: string) {
    const _effects = new Set<string>();

    for (const [k] of this._expressions) {
      const _deps = this.deps(k);
      if (_deps.has(sym)) {
        _effects.add(k);
      }
    }

    return _effects;
  }

  define(expression: string): void;
  define(sym: string, value: any): void;
  define(symOrExp: string, value?: any) {
    if (value !== undefined) this.define_symbol(symOrExp, value);
    else this.define_expression(symOrExp);
  }

  private define_expression(expression: string) {
    const exp = new Expression(expression);
    this._expressions.set(exp.target, exp);

    this._symbols.set(exp.target, this._symbols.get(exp.target) || Symbol.of(exp.target, NaN));
    for (const dep of exp.deps) {
      this._symbols.set(dep, this._symbols.get(dep) || Symbol.of(dep, NaN));
    }

    // 标记所有影响
    this._needsUpdate.add(exp.target);

    for (const sym of this.effects(exp.target)) {
      this._needsUpdate.add(sym);
    }
  }

  private define_symbol(key: string, value: any) {
    const relExp = this._expressions.get(key);
    if (relExp) throw new Error(`Symbol "${key}" already defined as expression "${relExp.rawExp}"`);

    let sym = this._symbols.get(key);
    if (!sym) {
      sym = Symbol.of(key, value);
      this._symbols.set(key, sym);
    } else {
      sym.value = value;
    }

    // 标记所有影响
    this._needsUpdate.add(key);

    for (const sym of this.effects(key)) {
      this._needsUpdate.add(sym);
    }
  }

  solve(sym: string) {
    const targetSym = this._symbols.get(sym);
    if (!targetSym) throw new Error('Symbol not defined: ' + sym);

    if (!this._needsUpdate.has(sym)) return targetSym.value; // 无需更新

    // 更新所有影响，深度优先遍历
    const _walk = (_cur: string) => {
      const _exp = this._expressions.get(_cur);
      if (!_exp) return;

      for (const _dep of _exp.deps) {
        _walk(_dep);
      }

      if (this._needsUpdate.has(_cur)) {
        _exp.evaluate(this._symbols);
        this._needsUpdate.delete(_cur);

        this.events.emit('solve', { sym: _cur });
      }
    };

    _walk(sym);

    return targetSym.value;
  }
}
