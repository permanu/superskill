---
id: rust-proj-mod-rs-dir
lang: rust
prefix: proj
title: "Use mod.rs for multi-file modules"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["mod", "dir", "multi-file", "modules"]
  files: ["**/*.rs"]
related: ["rust-proj-flat-small", "rust-proj-mod-by-feature", "rust-proj-pub-use-reexport"]
sources:
  - title: "rust-skills: proj-mod-rs-dir"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-mod-rs-dir.md
---
> Use mod.rs for multi-file modules

## Why

Rust offers two styles for multi-file modules. The `mod.rs` style is clearer for larger modules and aligns with how most Rust projects are structured. Choose one style consistently.

## Bad

```rust
// Mixing both styles in one crate — readers never know where to look
// src/user/mod.rs            (mod.rs style)
// src/order.rs + src/order/  (adjacent style)

// And applying one style blindly: a two-file module inside a mod.rs
// directory adds a nesting level with no benefit.
// src/util/mod.rs
// src/util/helpers.rs
```

## Good

```rust
// Choose one style and match it to the module's size.
//
// Simple module (1-3 submodules) — adjacent file:
// src/user.rs + src/user/model.rs + src/user/repository.rs
// - Module declaration outside the directory
// - Interface visible without entering the folder
// - Matches Rust 2018+ default lint preference
//
// Complex module (4+ submodules) — mod.rs:
// src/database/mod.rs + src/database/connection.rs + src/database/queries/
// - Clear that `database/` is a module directory
// - All module code inside the folder
// - Easier to move/rename entire modules
// - Common in large codebases (tokio, serde)
```

## See Also

- [rust-proj-flat-small](proj-flat-small.md) - Keep small projects flat
- [rust-proj-mod-by-feature](proj-mod-by-feature.md) - Feature organization
- [rust-proj-pub-use-reexport](proj-pub-use-reexport.md) - Re-export patterns
