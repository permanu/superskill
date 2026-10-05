---
id: rust-proj-mod-by-feature
lang: rust
prefix: proj
title: "Organize modules by feature, not type"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["mod", "feature", "organize", "modules", "type"]
  files: ["**/*.rs"]
related: ["rust-proj-flat-small", "rust-proj-pub-use-reexport", "rust-proj-lib-main-split"]
sources:
  - title: "rust-skills: proj-mod-by-feature"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-mod-by-feature.md
---
> Organize modules by feature, not type

## Why

Feature-based organization keeps related code together, making navigation intuitive and changes localized. Type-based organization (all handlers in one folder, all models in another) scatters related code across the codebase, making features harder to understand and modify.

## Bad

```rust
// src/
// ├── controllers/
// │   ├── user_controller.rs
// │   ├── order_controller.rs
// │   └── product_controller.rs
// ├── models/
// │   ├── user.rs
// │   ├── order.rs
// │   └── product.rs
// ├── services/
// │   ├── user_service.rs
// │   ├── order_service.rs
// │   └── product_service.rs
// └── repositories/
//     ├── user_repository.rs
//     ├── order_repository.rs
//     └── product_repository.rs
```

## Good

```rust
// src/
// ├── user/
// │   ├── mod.rs           # Re-exports public items
// │   ├── model.rs         # User struct, types
// │   ├── repository.rs    # Database operations
// │   ├── service.rs       # Business logic
// │   └── handler.rs       # HTTP handlers
// ├── order/
// │   ├── mod.rs
// │   ├── model.rs
// │   ├── repository.rs
// │   ├── service.rs
// │   └── handler.rs
// ├── product/
// │   ├── mod.rs
// │   ├── model.rs
// │   ├── repository.rs
// │   └── handler.rs
// └── lib.rs
```

## See Also

- [rust-proj-flat-small](proj-flat-small.md) - Keep small projects flat
- [rust-proj-pub-use-reexport](proj-pub-use-reexport.md) - Clean public API
- [rust-proj-lib-main-split](proj-lib-main-split.md) - Lib/main separation
