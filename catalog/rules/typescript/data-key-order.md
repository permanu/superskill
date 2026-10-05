---
id: typescript-data-key-order
lang: typescript
prefix: data
title: Keep ordered data in arrays, not object keys
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [key order, arrays, JSON object]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Object.keys]
related: [typescript-data-json-canonical, typescript-perf-map-churn]
sources:
  - title: RFC 8259 - The JavaScript Object Notation (JSON) Data Interchange Format
    url: https://www.rfc-editor.org/rfc/rfc8259.html
  - title: MDN - Object.keys
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
---
> Keep ordered sequences in arrays; object keys are an unordered collection and their order is not data.

## Why

A JSON object is an unordered collection of name/value pairs, and JavaScript property order follows its own rules rather than insertion history. A consumer that reads key order gets an arrangement nobody promised; an array states the sequence and survives every serialization round trip.

## Bad

```typescript
export function steps(record: Record<string, number>): string {
  return Object.keys(record).join(",");
}
```

## Good

```typescript
export function steps(record: [string, number][]): string {
  return record.map(([name]) => name).join(",");
}
```

## See Also

- [typescript-data-json-canonical](data-json-canonical.md) - sorting keys when a canonical form is required
- [typescript-perf-map-churn](perf-map-churn.md) - choosing a keyed collection for data that changes
