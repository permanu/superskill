---
id: typescript-err-result-union
lang: typescript
prefix: err
title: Return a discriminated result for expected failures and reserve throw for defects
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [result, union, validation, throw]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [ParseResult]
related: [typescript-err-boundary-parse, typescript-err-throw-error-only]
sources:
  - title: TypeScript Handbook - Narrowing (discriminated unions)
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  - title: TypeScript Handbook - Everyday Types (union types)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
---
> Return a discriminated union for expected failures; throw only for defects callers cannot handle.

## Why

Validation and not-found outcomes are part of a function's contract, and a throw makes them invisible in the signature. A discriminated result puts the failure in the type system, so callers must narrow before using the value and the compiler enforces handling.

## Bad

```typescript
function parseAge(raw: string): number {
  const age = Number(raw);
  if (!Number.isInteger(age) || age < 0) {
    throw new Error("age must be a non-negative integer");
  }
  return age;
}
```

## Good

```typescript
type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

function parseAge(raw: string): ParseResult {
  const age = Number(raw);
  if (!Number.isInteger(age) || age < 0) {
    return { ok: false, error: "age must be a non-negative integer" };
  }
  return { ok: true, value: age };
}

function readAge(raw: string): string {
  const result = parseAge(raw);
  return result.ok ? String(result.value) : result.error;
}
```

## See Also

- [typescript-err-boundary-parse](err-boundary-parse.md) - the parsing half of validation at the edge
- [typescript-err-throw-error-only](err-throw-error-only.md) - the contract for the defects that are still thrown
