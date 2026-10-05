---
id: typescript-async-parallelize-independent
lang: typescript
prefix: async
title: Start independent async work together instead of awaiting in sequence
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parallel, Promise.all, sequential, latency]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise.all]
related: [typescript-async-race-cancel, typescript-err-async-propagate]
sources:
  - title: MDN - Using promises (composition)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
  - title: MDN - Promise (concurrency)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
---
> Start independent async work together with a concurrency method instead of awaiting it in sequence.

## Why

Sequential awaits add the latencies together even when the operations share no data, and the wall-clock cost grows with every added call. A concurrency method starts the operations immediately and waits once, so the caller pays the slowest operation rather than the sum.

## Bad

```typescript
declare function fetchUser(id: string): Promise<string>;
declare function fetchOrders(id: string): Promise<string[]>;

async function load(id: string): Promise<[string, string[]]> {
  const user = await fetchUser(id);
  const orders = await fetchOrders(id);
  return [user, orders];
}
```

## Good

```typescript
declare function fetchUser(id: string): Promise<string>;
declare function fetchOrders(id: string): Promise<string[]>;

async function load(id: string): Promise<[string, string[]]> {
  const [user, orders] = await Promise.all([fetchUser(id), fetchOrders(id)]);
  return [user, orders];
}
```

## See Also

- [typescript-async-race-cancel](async-race-cancel.md) - cancelling the operations that lose a race
- [typescript-err-async-propagate](err-async-propagate.md) - how the combined rejection reaches a handler
