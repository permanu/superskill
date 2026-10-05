---
id: typescript-async-no-misused-promises
lang: typescript
prefix: async
title: Do not pass an async callback where a void return is expected
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/no-misused-promises"
baseline: latest
status: verified
triggers:
  keywords: [forEach, callback, void, async]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise, void]
related: [typescript-err-async-propagate, typescript-async-await-thenable]
sources:
  - title: typescript-eslint - no-misused-promises
    url: https://typescript-eslint.io/rules/no-misused-promises/
  - title: MDN - Using promises (error handling)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
---
> Do not pass an async callback where a void return is expected; nothing waits for its promise.

## Why

APIs such as `forEach` and event listeners type their callback as returning `void`, and TypeScript lets a promise-returning function satisfy that type by ignoring the result. The callback's promise floats, so rejections are unhandled and the surrounding function finishes before the work does.

## Bad

```typescript
declare function save(item: number): Promise<void>;

async function saveAll(items: number[]): Promise<void> {
  items.forEach(async (item) => {
    await save(item);
  });
}
```

## Good

```typescript
declare function save(item: number): Promise<void>;

async function saveAll(items: number[]): Promise<void> {
  for (const item of items) {
    await save(item);
  }
}
```

## See Also

- [typescript-err-async-propagate](err-async-propagate.md) - the floating promise this creates
- [typescript-async-await-thenable](async-await-thenable.md) - awaiting inside the callback that nothing awaits
