export class Symbol {
  readonly key: string;
  value: number = NaN;

  constructor(key: string, value?: number) {
    this.key = key;

    if (typeof value !== 'undefined') {
      this.value = value;
    }
  }
}
