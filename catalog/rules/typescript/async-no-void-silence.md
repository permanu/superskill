---
id: typescript-async-no-void-silence
lang: typescript
prefix: async
title: Handle promise rejections instead of silencing them with void
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [void, floating, rejection, fire and forget]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [void, Promise]
related: [typescript-err-async-propagate, typescript-async-promise-reject-error]
sources:
  - title: typescript-eslint - no-floating-promises (ignoreVoid warning)
    url: https://typescript-eslint.io/rules/no-floating-promises/
  - title: Node.js - Process ('unhandledRejection')
    url: https://nodejs.org/api/process.html
---
> Handle a promise rejection; `void promise` only silences the linter and still drops errors.

## Why

The `void` operator changes nothing at runtime: the promise is still created and its rejection is still unhandled. It records that someone saw the linter warning, not that the failure has a path to a handler, so a real error can terminate the process or vanish silently.

## Bad

```typescript
declare function save(draft: string): Promise<void>;

function queue(draft: string): void {
  void save(draft);
}
```

## Good

```typescript
declare function save(draft: string): Promise<void>;

async function queue(draft: string): Promise<void> {
  try {
    await save(draft);
  } catch (e) {
    console.error("save failed", e);
  }
}
```

## See Also

- [typescript-err-async-propagate](err-async-propagate.md) - the floating promise this rule removes
- [typescript-async-promise-reject-error](async-promise-reject-error.md) - what the rejection reason should be
