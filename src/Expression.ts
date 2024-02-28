import { Symbol } from './Symbol';

export class Expression {
  readonly exp: string;

  readonly target: string;
  readonly deps: string[] = [];

  private _evalFn: (symbols: Map<string, Symbol>) => any;

  constructor(content: string) {
    if (content.indexOf('=') < 0) throw new Error('No equal sign found in expression: ' + content);

    this.exp = content;

    // 正则匹配符号
    const re = /([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const keys: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      keys.push(match[1]);
    }

    if (keys.length === 0) throw new Error('No symbol found in expression: ' + content);

    // 创建符号
    this.target = keys.shift()!;
    this.deps = Array.from(new Set(keys));

    // 构造执行函数
    const _fnBody = `
    const ctx = {};
    
    for (const sym of symbols.values()) {
      Object.defineProperty(ctx, sym.key, {
        get() {
          return sym.value;
        },
        set(v) {
          sym.value = v;
        },
        enumerable: true
      });
    }

    with(ctx) {
      ${this.exp};
    }
    `;

    this._evalFn = new Function('symbols', _fnBody) as any;
  }

  evaluate(symbols: Map<string, Symbol>) {
    this._evalFn(symbols);
  }
}
