---
id: typescript-perf-huge-rule
lang: typescript
prefix: perf
title: Keep hot loops free of allocation and repeated shape checks
severity: must
enforce: review
baseline: TypeScript 5.9 / Node 26
status: verified
triggers:
  keywords: [huge, perf, hotloop]
sources:
  - title: Node.js - Profiling Node.js Applications
    url: https://nodejs.org/en/learn/getting-started/profiling
---
> Hoist invariants out of hot loops and avoid allocating per iteration.

## Why

Hot loops run millions of times, so every allocation and every repeated shape check is multiplied by the iteration count. Moving property loads, bound method lookups, and temporary object creation out of the loop keeps the JIT on its fast path and reduces garbage collection pauses. This rule exists as a deliberately oversized fixture so budget packing can be exercised against a real parser and a real token estimator: its body is far larger than any reasonable per-rule budget, which means a selector that packs rules into a fixed budget must mark it oversized, skip it, and keep evaluating the smaller rules that follow it. A selector that stops at the first item that does not fit would lose those smaller rules, and a selector that ignores the cap would blow the context window. Both failure modes are invisible on small fixtures, which is why this file carries a large body.

## Bad

```typescript
function sum(rows: Array<{ value: number }>): number {
  let total = 0;
  for (const row of rows) {
    const schema = buildSchema();
    const value = Number(row.value.toFixed(2));
    total += value * schema.scale;
  }
  return total;
}
```

## Good

```typescript
function sum(rows: Array<{ value: number }>): number {
  let total = 0;
  const { scale } = buildSchema();
  for (const row of rows) {
    total += Number(row.value.toFixed(2)) * scale;
  }
  return total;
}
```

## Notes on the oversized fixture

The paragraphs below exist only to make the token estimate of this rule larger than the budgets used by the selector tests. They are intentionally repetitive and stay inside the fixture pack, never inside the real catalog. Keeping them here preserves the realistic shape of a rule file while guaranteeing that the estimator reports a large number of tokens for this rule.

Consider a service that processes a stream of records. Each record passes through normalization, validation, enrichment, and persistence. If the loop body rebuilds helper objects, reparses configuration, or re-derives derived values that never change across iterations, the cost of those operations scales with the number of records instead of with the number of configuration changes. The fix is mechanical: compute the invariant once, before the loop, and reference it from inside. The same reasoning applies to closures that capture large objects, to regular expressions constructed per call, and to formatting options rebuilt for every row. When the loop is hot, these details dominate the profile even when the total line count of the loop is small.

A second pattern is repeated shape checks. Accessing a property through a union of several object shapes forces the engine to check the shape on every access. Narrowing once before the loop, or normalizing the input into a single shape at the boundary, removes the repeated checks and makes the loop body monomorphic. The boundary rule and this rule work together: parse into one shape at the edge, then keep the hot path free of revalidation. That pairing also makes the code easier to test because the loop receives values that already satisfy the invariant it depends on.

A third pattern is allocation inside the loop. Temporary arrays, object literals, and string concatenation all create garbage that the collector must later reclaim. Reusing a preallocated accumulator, appending into an array created once, or returning primitive values instead of wrapper objects keeps the allocation rate proportional to the result size rather than the iteration count. None of these changes alter the observable behavior of the function, which is what makes the rule safe to apply during review without a full rewrite of the surrounding module.

The remaining paragraphs repeat these observations with different wording to grow the file. A hot loop is any loop whose iteration count dominates the profile. The cheapest fix is usually to hoist an invariant. The second cheapest fix is to avoid allocating a temporary per iteration. The third is to keep object shapes stable so property access stays fast. Measuring before and after is still required because the JIT does not reward guesses and a deoptimized loop can be slower than the straightforward version. Profile, change one thing, and re-measure. That discipline keeps performance work honest and keeps the diff small enough to review.

When the profile shows a loop at the top, write down the iteration count and the per-iteration allocation budget before touching the code. If the loop runs a thousand times, nothing in it matters. If it runs a million times, every temporary object matters. The fixture continues with more prose purely to exceed the token budget used by the deterministic selector tests. Selector tests assert that an oversized item is dropped with an explicit reason, that the drop is recorded in the plan budget, and that items ordered after the oversized one are still considered. This paragraph and the ones around it are what make those assertions meaningful with realistic token counts rather than synthetic numbers.

End of the oversized fixture body.
