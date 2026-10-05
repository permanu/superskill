---
id: typescript-proj-no-property-access-from-index-signature
lang: typescript
prefix: proj
title: Access index-signature properties with brackets
severity: should
enforce: tool
tool: "tsc:noPropertyAccessFromIndexSignature"
baseline: latest
status: verified
triggers:
  keywords: [index signature, bracket access, settings]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-style-dot-notation, typescript-type-indexed-access-guard]
sources:
  - title: TypeScript - noPropertyAccessFromIndexSignature
    url: https://www.typescriptlang.org/tsconfig/noPropertyAccessFromIndexSignature.html
---
> Read index-signature properties with `record["key"]` so the access admits the key is not guaranteed.

## Why

Dot access on an index signature claims the property exists; bracket access signals that the key came from data and the value may be missing. The flag makes the syntax match that certainty, so the two access forms keep distinct meanings.

## Bad

```typescript
export function read(settings: Record<string, string>): string | undefined {
  return settings.theme;
}
```

## Good

```typescript
export function read(settings: Record<string, string>): string | undefined {
  return settings["theme"];
}
```

## See Also

- [typescript-style-dot-notation](style-dot-notation.md) - the known-property case, where dot access is correct
- [typescript-type-indexed-access-guard](type-indexed-access-guard.md) - guarding the value once the key may be absent
