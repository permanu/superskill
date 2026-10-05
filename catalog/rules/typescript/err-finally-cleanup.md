---
id: typescript-err-finally-cleanup
lang: typescript
prefix: err
title: Release resources in finally so every exit path cleans up
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [finally, cleanup, resource, close]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [finally]
related: [typescript-err-no-swallow]
sources:
  - title: MDN - try...catch (resource cleanup using finally)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch
---
> Release every acquired resource in a `finally` block so returns and throws cannot leak it.

## Why

Cleanup written after the work runs only on the success path: an early return, a throw, or a cancellation skips it. A `finally` block runs on every exit from the `try`, which is what makes the resource invariant hold.

## Bad

```typescript
class Connection {
  read(): string {
    return "";
  }

  close(): void {}
}

function withConnection(connection: Connection): string {
  const data = connection.read();
  if (data === "") {
    return "";
  }
  connection.close();
  return data;
}
```

## Good

```typescript
class Connection {
  read(): string {
    return "";
  }

  close(): void {}
}

function withConnection(connection: Connection): string {
  try {
    return connection.read();
  } finally {
    connection.close();
  }
}
```

## See Also

- [typescript-err-no-swallow](err-no-swallow.md) - cleanup must not hide the error that triggered it
