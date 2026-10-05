---
id: typescript-pat-custom-iterable
lang: typescript
prefix: pat
title: Make custom collections iterable
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Symbol.iterator, iterable, collection]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Symbol.iterator]
related: [typescript-pat-iterator-consumer, typescript-api-iterable-params]
sources:
  - title: MDN - Iteration protocols
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
  - title: TypeScript Handbook - Iterators and Generators
    url: https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html
---
> Implement `Symbol.iterator` on a custom collection so consumers can use `for...of`, spread, and `Array.from`.

## Why

An iterator method connects the class to every consumer that understands the iteration protocol, instead of a bespoke accessor each caller must learn. The protocol also gives the loop a way to signal early exit.

## Bad

```typescript
export class Bag {
  constructor(private items: string[]) {}

  at(index: number): string | undefined {
    return this.items[index];
  }
}
```

## Good

```typescript
export class Bag {
  constructor(private items: string[]) {}

  [Symbol.iterator](): Iterator<string> {
    return this.items[Symbol.iterator]();
  }
}
```

## See Also

- [typescript-pat-iterator-consumer](pat-iterator-consumer.md) - consuming the protocol from the other side
- [typescript-api-iterable-params](api-iterable-params.md) - accepting iterables where only iteration is needed
