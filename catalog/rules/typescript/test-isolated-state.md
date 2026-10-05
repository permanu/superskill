---
id: typescript-test-isolated-state
lang: typescript
prefix: test
title: Give each test its own state instead of sharing module fixtures
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [isolation, shared state, module, fixture]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: []
related: [typescript-test-mock-restore, typescript-test-public-api]
sources:
  - title: Node.js - Test runner (execution model and hooks)
    url: https://nodejs.org/api/test.html
---
> Give each test its own state; module-level fixtures make results depend on execution order.

## Why

A mutable module-level collection carries data from one test into the next, so a test passes alone and fails in a suite, or the reverse. Creating the state inside the test or a factory keeps every case independent of what ran before it.

## Bad

```typescript
const users: string[] = [];

function addUser(id: string): void {
  users.push(id);
}
```

## Good

```typescript
function createUsers(): string[] {
  return [];
}

function addUser(users: string[], id: string): void {
  users.push(id);
}
```

## See Also

- [typescript-test-mock-restore](test-mock-restore.md) - resetting shared mocks between tests
- [typescript-test-public-api](test-public-api.md) - asserting on state the test itself created
