---
id: typescript-sec-no-merge-untrusted
lang: typescript
prefix: sec
title: Build option objects from known keys, not merged input
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [prototype pollution, Object.assign, merge, options]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Object.assign]
related: [typescript-err-boundary-parse, typescript-api-options-object]
sources:
  - title: MDN - JavaScript prototype pollution
    url: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution
---
> Build option objects from known keys; never merge untrusted input into a target object.

## Why

Merging an untrusted object with `Object.assign` or a `for...in` copy triggers property assignment for every key it carries, including `__proto__` and `constructor`, which changes the target's prototype and can alter configuration objects across the application. Reading the keys the program defines, one at a time, keeps unknown keys out.

## Bad

```typescript
interface Options {
  mode: "cors" | "no-cors";
}

function parseOptions(input: string): Options {
  return Object.assign({ mode: "cors" }, JSON.parse(input));
}
```

## Good

```typescript
interface Options {
  mode: "cors" | "no-cors";
}

function parseOptions(input: unknown): Options {
  if (typeof input === "object" && input !== null && "mode" in input && input.mode === "no-cors") {
    return { mode: "no-cors" };
  }
  return { mode: "cors" };
}
```

## See Also

- [typescript-err-boundary-parse](err-boundary-parse.md) - parsing input into a typed value at the edge
- [typescript-api-options-object](api-options-object.md) - the option object being constructed
