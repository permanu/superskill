---
id: rust-doc-crate-readme
lang: rust
prefix: doc
title: "Unify the README and crate root docs with `#![doc = include_str!(\"../README.md\")]`"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "requires a fixture README.md for include_str!"
triggers:
  keywords: ["crate", "readme", "unify", "root", "docs", "doc", "include_str"]
  files: ["**/*.rs"]
related: ["rust-doc-module-inner", "rust-doc-cargo-metadata", "rust-doc-all-public"]
sources:
  - title: "rust-skills: doc-crate-readme"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-crate-readme.md
---
> Unify the README and crate root docs with `#![doc = include_str!("../README.md")]`

## Why

Maintaining a `README.md` and a separate crate-level doc comment in `lib.rs` leads to inevitable drift: the README gets updated for GitHub/crates.io visitors while the rustdoc front page grows stale, or vice versa. The `include_str!` attribute macro makes the README the single source of truth for both surfaces. Set `readme = "README.md"` in `Cargo.toml` so crates.io also picks up the same file. The result: one file, three consistent rendering targets — GitHub, crates.io, and docs.rs.

## Bad

```rust
// src/lib.rs — separate doc comment that will drift from README.md
//! # my-crate
//!
//! A library for doing things. (duplicate, will get out of date)
//!
//! See the README for the full usage guide.

pub fn do_thing() {}

// # Cargo.toml — readme field absent; crates.io shows nothing
// [package]
// name = "my-crate"
// version = "0.1.0"
// edition = "2024"
```

## Good

```rust
// src/lib.rs — README is the single source of truth
#![doc = include_str!("../README.md")]

pub fn do_thing() {}

// # Cargo.toml
// [package]
// name = "my-crate"
// version = "0.1.0"
// edition = "2024"
// readme = "README.md"          # crates.io landing page
// documentation = "https://docs.rs/my-crate"
```

## See Also

- [rust-doc-module-inner](doc-module-inner.md) - Use `//!` for module-level documentation
- [rust-doc-cargo-metadata](doc-cargo-metadata.md) - fill Cargo.toml metadata fields
- [rust-doc-all-public](doc-all-public.md) - Document all public items with `///`
