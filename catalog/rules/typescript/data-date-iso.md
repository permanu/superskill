---
id: typescript-data-date-iso
lang: typescript
prefix: data
title: Serialize timestamps as ISO 8601 UTC strings
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ISO 8601, timestamp, serialization]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [toISOString]
related: [typescript-data-date-parse-check]
sources:
  - title: MDN - Date.prototype.toISOString
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
  - title: MDN - JSON.stringify
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
---
> Serialize timestamps with `toISOString` so the wire value is UTC, fixed-width, and parseable everywhere.

## Why

`toString` output depends on the host locale and timezone, so the same instant serializes differently across machines and cannot be parsed back reliably. `toISOString` always emits UTC in the date-time string format that `Date.parse` and other runtimes read.

## Bad

```typescript
export function serialize(date: Date): string {
  return date.toString();
}
```

## Good

```typescript
export function serialize(date: Date): string {
  return date.toISOString();
}
```

## See Also

- [typescript-data-date-parse-check](data-date-parse-check.md) - validating the ISO strings on the way back in
