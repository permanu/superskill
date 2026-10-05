---
id: c-perf-pgo
lang: c
prefix: perf
title: Use profile-guided optimization instead of hand-guessed branch hints
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [PGO, profile, branch prediction, optimization]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-perf-optimize-release, c-obs-levels]
sources:
  - title: Clang - Profile-guided optimization
    url: https://clang.llvm.org/docs/UsersManual.html#profile-guided-optimization
---
> Build once with instrumentation, run the workload, and rebuild with the profile.

## Why

Clang's user manual documents the profile-guided workflow: generate a profile from representative runs, then use it to lay out branches and inline where execution actually goes. Hand-written hints encode one developer's guess and age as the workload changes. The profile is data from the real workload and needs no source changes.

## Bad

```c
int likely_error(int code) {
    return __builtin_expect(code != 0, 0);   /* hand-guessed probability */
}
```

## Good

```c
int is_error(int code) {
    return code != 0;   /* let the profile place the branch */
}
```

## See Also

- [c-perf-optimize-release](perf-optimize-release.md) - the baseline optimized build
- [c-obs-levels](obs-levels.md) - instrumentation that also informs operational decisions
