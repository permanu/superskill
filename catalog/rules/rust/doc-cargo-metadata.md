---
id: rust-doc-cargo-metadata
lang: rust
prefix: doc
title: "Fill `Cargo.toml` metadata for published crates"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["cargo", "metadata", "fill", "toml", "published", "crates"]
  files: ["**/*.rs"]
related: ["rust-doc-module-inner", "rust-lint-cargo-metadata", "rust-proj-workspace-deps"]
sources:
  - title: "rust-skills: doc-cargo-metadata"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-cargo-metadata.md
---
> Fill `Cargo.toml` metadata for published crates

## Why

Cargo.toml metadata appears on crates.io, in search results, and helps users evaluate your crate. Missing metadata makes your crate look unprofessional, harder to find, and harder to trust. Complete metadata improves discoverability and adoption.

## Bad

```rust
// [package]
// name = "my-awesome-crate"
// version = "0.1.0"
// edition = "2021"

// [dependencies]
// serde = "1"
```

## Good

```rust
// [package]
// name = "my-awesome-crate"
// version = "0.1.0"
// edition = "2021"
// rust-version = "1.70"

// # Required for crates.io
// description = "A fast, ergonomic HTTP client for Rust"
// license = "MIT OR Apache-2.0"
// repository = "https://github.com/username/my-awesome-crate"

// # Highly recommended
// documentation = "https://docs.rs/my-awesome-crate"
// readme = "README.md"
// keywords = ["http", "client", "async", "networking"]
// categories = ["network-programming", "web-programming::http-client"]

// [dependencies]
// serde = "1"
```

## See Also

- [rust-doc-module-inner](doc-module-inner.md) - Crate-level documentation
- [rust-lint-cargo-metadata](lint-cargo-metadata.md) - Linting Cargo.toml
- [rust-proj-workspace-deps](proj-workspace-deps.md) - Workspace management
