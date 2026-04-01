export abstract class AbstractFactory<T> {
  abstract build(overrides?: Partial<T>): T;
}
