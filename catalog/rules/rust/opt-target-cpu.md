---
id: rust-opt-target-cpu
lang: rust
prefix: opt
title: "Use `target-cpu=native` for maximum performance on known deployment targets"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["target", "cpu", "target-cpu", "native", "maximum", "performance", "known", "deployment"]
  files: ["**/*.rs"]
related: ["rust-opt-lto-release", "rust-opt-simd-portable", "rust-opt-codegen-units"]
sources:
  - title: "rust-skills: opt-target-cpu"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-target-cpu.md
---
> Use `target-cpu=native` for maximum performance on known deployment targets

## Why

By default, Rust compiles for a generic x86-64 baseline (roughly Sandy Bridge era). Modern CPUs have SIMD extensions (AVX2, AVX-512), improved instructions, and micro-architectural optimizations that go unused. `target-cpu=native` enables all features of your current CPU, potentially unlocking significant speedups.

## Bad

```rust
// # Cargo.toml - compiles for generic x86-64
// [profile.release]
// # No target-cpu specified
// # Binary works everywhere but uses only SSE2
```

## Good

```rust
// # .cargo/config.toml - for known deployment target
// [build]
// rustflags = ["-C", "target-cpu=native"]

// # Or specific CPU for cross-compilation
// # rustflags = ["-C", "target-cpu=skylake"]
```

## See Also

- [rust-opt-lto-release](opt-lto-release.md) - Combine with LTO
- [rust-opt-simd-portable](opt-simd-portable.md) - Portable SIMD
- [rust-opt-codegen-units](opt-codegen-units.md) - Single codegen unit
