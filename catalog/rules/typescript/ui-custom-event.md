---
id: typescript-ui-custom-event
lang: typescript
prefix: ui
title: Type CustomEvent payloads
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [CustomEvent, detail, events]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-ui-form-narrow, typescript-api-named-exports]
sources:
  - title: MDN - CustomEvent
    url: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent
---
> Pass the payload type to `CustomEvent<T>` so listeners read a typed `detail`.

## Why

`CustomEvent` defaults its `detail` to `any`, so listeners reach into the payload without checking. The type argument records the shape once and propagates it to every handler that types the event.

## Bad

```typescript
export function emit(target: EventTarget): void {
  target.dispatchEvent(new CustomEvent("saved", { detail: { id: "1" } }));
}
```

## Good

```typescript
export interface SavedDetail {
  id: string;
}

export function emit(target: EventTarget): void {
  target.dispatchEvent(new CustomEvent<SavedDetail>("saved", { detail: { id: "1" } }));
}
```

## See Also

- [typescript-ui-form-narrow](ui-form-narrow.md) - the same explicitness for form values
- [typescript-api-named-exports](api-named-exports.md) - naming the type the payload uses
