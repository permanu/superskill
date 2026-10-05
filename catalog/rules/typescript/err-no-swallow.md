---
id: typescript-err-no-swallow
lang: typescript
prefix: err
title: Handle, wrap, or rethrow every caught error; never drop it
severity: must
enforce: both
tool: "eslint:no-empty"
baseline: latest
status: verified
triggers:
  keywords: [empty catch, swallow, ignore, rethrow]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [catch]
related: [typescript-err-wrap-with-cause, typescript-err-log-once]
sources:
  - title: ESLint - no-empty
    url: https://eslint.org/docs/latest/rules/no-empty
  - title: MDN - try...catch
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch
---
> Never leave a catch block that silently drops the failure; handle it, wrap it, or rethrow it.

## Why

An empty or comment-only catch block converts a detectable failure into apparent success, which surfaces later as corrupted state or missing data with no trace of the origin. A catch block must either resolve the condition it names or propagate the error unchanged.

## Bad

```typescript
declare function persist(draft: string): void;

function saveDraft(draft: string): void {
  try {
    persist(draft);
  } catch {}
}
```

## Good

```typescript
declare function persist(draft: string): void;
declare function clearOldDrafts(): void;

class QuotaExceededError extends Error {}

function saveDraft(draft: string): void {
  try {
    persist(draft);
  } catch (e) {
    if (!(e instanceof QuotaExceededError)) {
      throw e;
    }
    clearOldDrafts();
    persist(draft);
  }
}
```

## See Also

- [typescript-err-wrap-with-cause](err-wrap-with-cause.md) - wrapping instead of dropping when the failure cannot be handled here
- [typescript-err-log-once](err-log-once.md) - where a failure should be logged once it is handled
