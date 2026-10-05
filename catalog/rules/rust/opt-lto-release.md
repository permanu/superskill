---
id: rust-opt-lto-release
lang: rust
prefix: opt
title: "Enable LTO in release builds"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["lto", "release", "enable", "builds"]
  files: ["**/*.rs"]
related: ["rust-opt-codegen-units", "rust-opt-pgo-profile", "rust-perf-release-profile"]
sources:
  - title: "rust-skills: opt-lto-release"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-lto-release.md
  - title: "doc.rust-lang.org/cargo/reference/profiles.html"
    url: https://doc.rust-lang.org/cargo/reference/profiles.html
---
> Enable LTO in release builds

## Why

Link-Time Optimization (LTO) enables optimizations across crate boundaries that aren't possible during normal compilation. This includes cross-crate inlining, dead code elimination, and devirtualization. Typically provides 5-20% performance improvement.

## Bad

```rust
// # Cargo.toml - default release profile
// [profile.release]
// opt-level = 3
// # No LTO = missed optimization opportunities
```

## Good

```rust
// # Cargo.toml - optimized release profile
// [profile.release]
// opt-level = 3
// lto = "fat"          # Maximum optimization
// codegen-units = 1    # Better optimization (single codegen unit)
// panic = "abort"      # Smaller binary, no unwind tables
// strip = true         # Remove symbols for smaller binary
```

## See Also

- [rust-opt-codegen-units](opt-codegen-units.md) - Use codegen-units = 1
- [rust-opt-pgo-profile](opt-pgo-profile.md) - Profile-guided optimization
- [rust-perf-release-profile](perf-release-profile.md) - Full release profile settings
