---
id: typescript-data-literal-union
lang: typescript
prefix: data
title: Type a closed set of wire values as a literal union
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [literal union, wire values, status]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-type-exhaustive-union, typescript-data-explicit-wire-shape]
sources:
  - title: TypeScript Handbook - Everyday Types (literal types)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
  - title: MDN - JSON
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
---
> Give a field the literal union of values the wire format allows instead of `string`.

## Why

A `string` field accepts any typo and forces every comparison to be defensive; the literal union names the vocabulary the payload actually has, so an unknown value fails where it enters and exhaustive checks cover the rest.

## Bad

```typescript
export interface Job {
  status: string;
}

export function isDone(job: Job): boolean {
  return job.status === "done";
}
```

## Good

```typescript
export interface Job {
  status: "queued" | "running" | "done";
}

export function isDone(job: Job): boolean {
  return job.status === "done";
}
```

## See Also

- [typescript-type-exhaustive-union](type-exhaustive-union.md) - handling every member of the union
- [typescript-data-explicit-wire-shape](data-explicit-wire-shape.md) - fixing the fields the wire carries
