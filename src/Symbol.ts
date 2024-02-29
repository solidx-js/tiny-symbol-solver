export class Symbol<T = any> {
  static of<K>(key: string, value: K) {
    const s = new Symbol<K>(key);
    s.value = value;
    return s;
  }

  readonly key: string;
  value!: T;

  constructor(key: string) {
    this.key = key;
  }
}
