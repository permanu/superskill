---
id: typescript-conc-abort-composition
lang: typescript
prefix: conc
title: Combine abort signals with AbortSignal.any
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [AbortSignal, abort composition, signal]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [AbortSignal.any]
related: [typescript-async-timeout-signal, typescript-async-abort-listener-cleanup]
sources:
  - title: MDN - AbortSignal.any
    url: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static
---
> Combine several abort signals with `AbortSignal.any` instead of wiring a controller by hand.

## Why

Relaying each signal into a new controller needs listeners that must also be removed, and a missed removal keeps the sources alive. `AbortSignal.any` returns one signal that aborts when any input does, with the first abort reason preserved.

## Bad

```typescript
declare function fetchWith(signal: AbortSignal): Promise<string>;

export function both(timeout: AbortSignal, user: AbortSignal): Promise<string> {
  const controller = new AbortController();
  timeout.addEventListener("abort", () => controller.abort());
  user.addEventListener("abort", () => controller.abort());
  return fetchWith(controller.signal);
}
```

## Good

```typescript
declare function fetchWith(signal: AbortSignal): Promise<string>;

export function both(timeout: AbortSignal, user: AbortSignal): Promise<string> {
  return fetchWith(AbortSignal.any([timeout, user]));
}
```

## See Also

- [typescript-async-timeout-signal](async-timeout-signal.md) - creating the timeout signal that gets combined
- [typescript-async-abort-listener-cleanup](async-abort-listener-cleanup.md) - cleaning up listeners when composing by hand
