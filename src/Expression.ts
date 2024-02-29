import { Symbol } from './Symbol';

export class Expression {
  static parseSymbols(content: string) {
    // 正则匹配符号
    const re = /([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const keys: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      keys.push(match[1]);
    }

    return keys;
  }

  rawExp: string = '';

  target: string = '';
  deps: string[] = [];
  privateSymbols: string[] = [];

  private _evalFn: (ctx: any) => any = () => {
    throw new Error('Not initialized');
  };

  constructor(content: string) {
    if (content.indexOf('=') < 0) throw new Error('No equal sign found in expression: ' + content);
    if (content.indexOf('=') === 0) throw new Error('Invalid expression: ' + content);

    this.rawExp = content;

    // 判断目标是数字还是宏
    const _t = content.split('=')[0].trim();

    if (_t.includes('(') && _t.includes(')')) this.init_target_is_macro(content);
    else this.init_target_is_number(content);
  }

  private init_target_is_number(content: string) {
    const keys = Expression.parseSymbols(content);
    if (keys.length === 0) throw new Error('No symbol found in expression: ' + content);

    // 创建符号
    this.target = keys.shift()!;
    this.deps = Array.from(new Set(keys));

    // 构造执行函数
    const _fnBody = `
with(ctx) {
  ${content};
}
    `;

    this._evalFn = new Function('ctx', _fnBody) as any;
  }

  private init_target_is_macro(content: string) {
    const keys = Expression.parseSymbols(content);
    if (keys.length === 0) throw new Error('No symbol found in expression: ' + content);

    // function name
    this.target = keys.shift()!;

    // function args
    const argStr = content.match(/\(([^)]+)\)/)![1];
    const args = argStr.split(',').map(v => v.trim());
    this.privateSymbols = args;

    const _keySet = new Set(keys);
    args.forEach(v => _keySet.delete(v)); // remove args from keys

    // deps
    this.deps = Array.from(_keySet);

    // 构造执行函数
    const exp = `${this.target} = (${args.join(', ')}) => (${content.split('=')[1]})`;

    const _fnBody = `
with(ctx) {
  return (${exp});
}
    `;

    this._evalFn = new Function('ctx', _fnBody) as any;
  }

  evaluate(symbols: Map<string, Symbol>) {
    const ctx: any = {};

    for (const sym of symbols.values()) {
      if (this.privateSymbols.includes(sym.key)) continue; // skip private symbols

      Object.defineProperty(ctx, sym.key, {
        get() {
          return sym.value;
        },
        set(v) {
          sym.value = v;
        },
        enumerable: true,
      });
    }

    this._evalFn(ctx);
  }
}
