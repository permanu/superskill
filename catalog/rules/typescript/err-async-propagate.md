---
id: typescript-err-async-propagate
lang: typescript
prefix: err
title: Await or return every promise so rejections reach a handler
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/no-floating-promises"
baseline: latest
status: verified
triggers:
  keywords: [promise, floating, rejection, await]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise, await]
related: [typescript-err-no-swallow, typescript-err-abort-cancellation]
sources:
  - title: typescript-eslint - no-floating-promises
    url: https://typescript-eslint.io/rules/no-floating-promises/
  - title: Node.js - Process ('unhandledRejection')
    url: https://nodejs.org/api/process.html
  - title: MDN - Using promises (error handling)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
---
> Await or return every promise; a floating promise hides its rejection from every handler.

## Why

A promise statement that is neither awaited nor returned detaches its rejection from the surrounding flow. Node.js reports the unhandled rejection and, with default settings, terminates the process; even when it does not, the operation's failure is lost while callers proceed as if it succeeded.

## Bad

```typescript
declare function syncOrders(): Promise<number>;

function refresh(): void {
  syncOrders();
}

async function refreshAll(): Promise<void> {
  syncOrders().then((count) => {
    console.log(`synced ${count}`);
  });
}
```

## Good

```typescript
declare function syncOrders(): Promise<number>;

async function refresh(): Promise<number> {
  return await syncOrders();
}

async function refreshAll(): Promise<void> {
  try {
    const count = await syncOrders();
    console.log(`synced ${count}`);
  } catch (e) {
    console.error("sync failed", e);
  }
}
```

## See Also

- [typescript-err-no-swallow](err-no-swallow.md) - the synchronous version of the same no-drop rule
- [typescript-err-abort-cancellation](err-abort-cancellation.md) - separating cancellation from a real rejection
