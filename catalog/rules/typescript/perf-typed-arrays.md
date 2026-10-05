---
id: typescript-perf-typed-arrays
lang: typescript
prefix: perf
title: Store bulk numeric data in typed arrays
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [typed array, Float64Array, binary, buffer]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Float64Array, ArrayBuffer]
related: [typescript-perf-measure-first, typescript-perf-set-membership]
sources:
  - title: MDN - JavaScript typed arrays
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays
---
> Use typed arrays for bulk binary or numeric data instead of plain number arrays.

## Why

A plain array stores references to boxed values, while a typed array reads and writes raw binary values of a fixed width in an `ArrayBuffer`, which MDN presents as the interface for binary data and platform APIs. For large numeric buffers, the typed form removes the per-element wrapper and the representation is fixed.

## Bad

```typescript
function scale(values: number[], factor: number): number[] {
  return values.map((value) => value * factor);
}
```

## Good

```typescript
function scale(values: Float64Array, factor: number): Float64Array {
  const result = new Float64Array(values.length);
  for (let i = 0; i < values.length; i += 1) {
    result[i] = values[i] * factor;
  }
  return result;
}
```

## See Also

- [typescript-perf-measure-first](perf-measure-first.md) - confirming the buffer is the bottleneck
- [typescript-perf-set-membership](perf-set-membership.md) - the lookup structure for non-numeric data
