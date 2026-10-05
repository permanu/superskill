---
id: rust-opt-codegen-units
lang: rust
prefix: opt
title: "Set `codegen-units = 1` for maximum optimization in release builds"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["codegen", "units", "set", "codegen-units", "maximum", "optimization", "release", "builds"]
  files: ["**/*.rs"]
related: ["rust-opt-lto-release", "rust-opt-pgo-profile", "rust-opt-target-cpu"]
sources:
  - title: "rust-skills: opt-codegen-units"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-codegen-units.md
---
> Set `codegen-units = 1` for maximum optimization in release builds

## Why

By default, Cargo splits code into multiple codegen units for parallel compilation. This speeds up builds but prevents some cross-unit optimizations. Setting `codegen-units = 1` allows LLVM to optimize across the entire crate, potentially improving runtime performance by 5-20% at the cost of slower builds.

## Bad

```rust
// # Cargo.toml - default settings
// [profile.release]
// # codegen-units defaults to 16
// # Fast to compile, but misses optimization opportunities
```

## Good

```rust
// # Cargo.toml - optimized for runtime performance
// [profile.release]
// codegen-units = 1  # Single unit = better optimization
// lto = true         # Link-time optimization
// opt-level = 3      # Maximum optimization
```

## See Also

- [rust-opt-lto-release](opt-lto-release.md) - Link-time optimization
- [rust-opt-pgo-profile](opt-pgo-profile.md) - Profile-guided optimization
- [rust-opt-target-cpu](opt-target-cpu.md) - CPU-specific optimization
