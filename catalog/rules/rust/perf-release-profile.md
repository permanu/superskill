---
id: rust-perf-release-profile
lang: rust
prefix: perf
title: "Optimize release profile settings"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["release", "profile", "optimize", "settings"]
  files: ["**/*.rs"]
related: ["rust-opt-lto-release", "rust-opt-codegen-units", "rust-opt-pgo-profile"]
sources:
  - title: "rust-skills: perf-release-profile"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-release-profile.md
---
> Optimize release profile settings

## Why

The default release profile prioritizes compile speed over runtime performance. For production binaries, tuning the release profile can yield significant performance improvements (10-40% in some cases) at the cost of longer compile times.

## Bad

```rust
// [profile.release]
// opt-level = 3
// debug = false
// lto = false
// codegen-units = 16
```

## Good

```rust
// [profile.release]
// opt-level = 3          # Maximum optimization
// lto = "fat"            # Full link-time optimization
// codegen-units = 1      # Better optimization, slower compile
// panic = "abort"        # Smaller binary, no unwinding
// strip = true           # Remove symbols

// [profile.release.package."*"]
// # Keep dependencies optimized even if main crate changes
// opt-level = 3
```

## See Also

- [rust-opt-lto-release](opt-lto-release.md) - LTO details
- [rust-opt-codegen-units](opt-codegen-units.md) - Codegen units
- [rust-opt-pgo-profile](opt-pgo-profile.md) - Profile-guided optimization
