---
id: rust-name-crate-no-rs
lang: rust
prefix: name
title: "Don't suffix crate names with `-rs` or `-rust`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["crate", "don", "suffix", "names", "-rs", "-rust"]
  files: ["**/*.rs"]
related: ["rust-proj-workspace-deps", "rust-doc-cargo-metadata", "rust-name-funcs-snake"]
sources:
  - title: "rust-skills: name-crate-no-rs"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-crate-no-rs.md
---
> Don't suffix crate names with `-rs` or `-rust`

## Why

Adding `-rs` or `-rust` to crate names is redundant—you're already on crates.io, it's obviously Rust. These suffixes waste characters, clutter the namespace, and can make crate names harder to type. The Rust community discourages this pattern.

## Bad

```rust
// # Cargo.toml
// [package]
// name = "json-parser-rs"    # Redundant -rs
// name = "my-lib-rust"       # Redundant -rust
// name = "http-client-rs"    # We know it's Rust
// name = "rust-sqlite"       # rust- prefix equally bad
```

## Good

```rust
// # Cargo.toml
// [package]
// name = "json-parser"
// name = "my-lib"
// name = "http-client"
// name = "sqlite-wrapper"

// # Real crate examples (no -rs):
// # serde (not serde-rs)
// # tokio (not tokio-rs)
// # reqwest (not reqwest-rs)
// # clap (not clap-rs)
```

## See Also

- [rust-proj-workspace-deps](proj-workspace-deps.md) - Cargo configuration
- [rust-doc-cargo-metadata](doc-cargo-metadata.md) - Package metadata
- [rust-name-funcs-snake](name-funcs-snake.md) - Naming conventions
