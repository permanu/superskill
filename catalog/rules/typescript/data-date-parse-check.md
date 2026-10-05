---
id: typescript-data-date-parse-check
lang: typescript
prefix: data
title: Reject date strings that do not parse
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Date.parse, invalid date, boundary]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Date.parse]
related: [typescript-data-date-iso, typescript-err-boundary-parse]
sources:
  - title: MDN - Date.parse
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
---
> Check `Date.parse` for `NaN` and fail the boundary instead of passing an invalid date inward.

## Why

An unparseable string does not throw: it produces an invalid date whose timestamp is `NaN`, and that `NaN` spreads through every later calculation. Parsing once at the boundary and failing there keeps the rest of the code working with valid timestamps.

## Bad

```typescript
export function timeOf(value: string): number {
  return new Date(value).getTime();
}
```

## Good

```typescript
export function timeOf(value: string): number {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new Error("invalid timestamp");
  }
  return time;
}
```

## See Also

- [typescript-data-date-iso](data-date-iso.md) - the format that parses back reliably
- [typescript-err-boundary-parse](err-boundary-parse.md) - validating external input where it enters
