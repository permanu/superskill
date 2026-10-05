---
id: typescript-test-public-api
lang: typescript
prefix: test
title: Assert through the public API instead of private state
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [public API, private state, behavior, implementation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [private]
related: [typescript-test-typed-fixtures, typescript-test-isolated-state]
sources:
  - title: Testing Library - Guiding Principles
    url: https://testing-library.com/docs/guiding-principles/
  - title: TypeScript Handbook - Classes (visibility)
    url: https://www.typescriptlang.org/docs/handbook/2/classes.html
---
> Assert through the public API; reaching into private state couples tests to implementation.

## Why

A test that casts past `private` to read internal fields breaks whenever the representation changes, even when observable behavior is unchanged. Asserting through the public surface tests the contract callers depend on and leaves the implementation free to change.

## Bad

```typescript
class Cart {
  private items: string[] = [];

  add(item: string): void {
    this.items.push(item);
  }

  itemCount(): number {
    return this.items.length;
  }
}

const cart = new Cart();
cart.add("book");
const state = cart as unknown as { items: string[] };
console.log(state.items.length);
```

## Good

```typescript
class Cart {
  private items: string[] = [];

  add(item: string): void {
    this.items.push(item);
  }

  itemCount(): number {
    return this.items.length;
  }
}

const cart = new Cart();
cart.add("book");
console.log(cart.itemCount());
```

## See Also

- [typescript-test-typed-fixtures](test-typed-fixtures.md) - fixtures built against the same public types
- [typescript-test-isolated-state](test-isolated-state.md) - independence from internal state between tests
