---
id: c-perf-optimize-release
lang: c
prefix: perf
title: Ship and benchmark with optimization enabled
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [O2, optimization, benchmark, release build]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-inline-abuse, c-perf-pgo]
sources:
  - title: GCC - Options That Control Optimization
    url: https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html
---
> Build release and benchmark configurations with `-O2`; let the optimizer do the unrolling.

## Why

GCC's optimization options page shows that `-O2` enables the standard transformation set: inlining, hoisting, loop scheduling, and the rest. A benchmark compiled with no optimization measures the unoptimized code and misleads every decision made from it, and hand-unrolling to compensate duplicates work the compiler already performs. Measure the configuration that ships.

## Bad

```c
int sum_four(const int *v) {
    return v[0] + v[1] + v[2] + v[3];   /* hand-unrolled for speed */
}
```

## Good

```c
int sum_four(const int *v) {
    int total = 0;
    for (int i = 0; i < 4; ++i) {
        total += v[i];
    }
    return total;   /* -O2 unrolls this itself */
}
```

## See Also

- [c-anti-inline-abuse](anti-inline-abuse.md) - the same restraint for inline
- [c-perf-pgo](perf-pgo.md) - the next step when profiles are available
