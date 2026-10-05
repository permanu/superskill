---
id: rust-proj-flat-small
lang: rust
prefix: proj
title: "Keep small projects flat"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["flat", "small", "keep", "projects"]
  files: ["**/*.rs"]
related: ["rust-proj-mod-by-feature", "rust-proj-lib-main-split", "rust-proj-mod-rs-dir"]
sources:
  - title: "rust-skills: proj-flat-small"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-flat-small.md
---
> Keep small projects flat

## Why

Over-organizing small projects adds navigation overhead without benefit. A project with 5-10 files doesn't need nested directories. Start flat, add structure only when complexity demands it.

## Bad

```rust
// src/
// ├── core/
// │   └── mod.rs           # Just re-exports
// ├── domain/
// │   ├── mod.rs
// │   └── models/
// │       ├── mod.rs
// │       └── user.rs      # 50 lines
// ├── infrastructure/
// │   ├── mod.rs
// │   └── database/
// │       ├── mod.rs
// │       └── connection.rs # 30 lines
// ├── application/
// │   ├── mod.rs
// │   └── services/
// │       └── mod.rs       # Empty
// └── main.rs
```

## Good

```rust
// src/
// ├── main.rs
// ├── lib.rs
// ├── config.rs
// ├── database.rs
// ├── user.rs
// └── error.rs
```

## See Also

- [rust-proj-mod-by-feature](proj-mod-by-feature.md) - Feature organization
- [rust-proj-lib-main-split](proj-lib-main-split.md) - Lib/main separation
- [rust-proj-mod-rs-dir](proj-mod-rs-dir.md) - Multi-file modules
