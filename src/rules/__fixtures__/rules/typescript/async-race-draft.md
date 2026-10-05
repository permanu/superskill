---
id: typescript-async-race-draft
lang: typescript
prefix: async
title: Keep concurrent tasks independent so one rejection cannot orphan the rest
severity: must
enforce: review
baseline: TypeScript 5.9 / Node 26
status: draft
triggers:
  keywords: [async, await, race]
  files: ["**/*.ts"]
  symbols: [Promise.all]
sources:
  - title: MDN - Promise.allSettled
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
---
> Use allSettled when every task must report its own outcome.

## Why

Promise.all rejects on the first failure and leaves sibling results unreachable. Callers that need per-task reporting lose them.

## Bad

```typescript
const results = await Promise.all(tasks);
```

## Good

```typescript
const results = await Promise.allSettled(tasks);
```
