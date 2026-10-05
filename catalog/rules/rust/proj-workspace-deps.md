---
id: rust-proj-workspace-deps
lang: rust
prefix: proj
title: "Use workspace dependency inheritance for consistent versions across crates"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["workspace", "deps", "dependency", "inheritance", "consistent", "versions", "across", "crates"]
  files: ["**/*.rs"]
related: ["rust-proj-lib-main-split", "rust-api-serde-optional", "rust-lint-deny-correctness"]
sources:
  - title: "rust-skills: proj-workspace-deps"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-workspace-deps.md
---
> Use workspace dependency inheritance for consistent versions across crates

## Why

Multi-crate workspaces accumulate dependency version drift—different crates using different versions of the same dependency. Workspace dependency inheritance lets you declare dependencies once in the workspace `Cargo.toml` and inherit them in member crates, ensuring consistency.

## Bad

```rust
// # crate-a/Cargo.toml
// [dependencies]
// serde = "1.0.150"
// tokio = "1.25"

// # crate-b/Cargo.toml  
// [dependencies]
// serde = "1.0.188"  # Different version!
// tokio = "1.32"     # Different version!

// # Version drift leads to:
// # - Larger binaries (multiple versions)
// # - Compilation time increase
// # - Subtle behavior differences
```

## Good

```rust
// # Root Cargo.toml
// [workspace]
// members = ["crate-a", "crate-b", "crate-c"]

// [workspace.dependencies]
// serde = { version = "1.0", features = ["derive"] }
// tokio = { version = "1.32", features = ["full"] }
// thiserror = "1.0"
// anyhow = "1.0"
// tracing = "0.1"

// # crate-a/Cargo.toml
// [dependencies]
// serde.workspace = true
// tokio.workspace = true

// # crate-b/Cargo.toml
// [dependencies]
// serde.workspace = true
// tokio.workspace = true
// thiserror.workspace = true
```

## See Also

- [rust-proj-lib-main-split](proj-lib-main-split.md) - Workspace structure
- [rust-api-serde-optional](api-serde-optional.md) - Optional dependencies
- [rust-lint-deny-correctness](lint-deny-correctness.md) - Workspace lints
