---
id: rust-lint-cargo-metadata
lang: rust
prefix: lint
title: "Enable clippy::cargo for published crates"
severity: should
enforce: tool
tool: clippy::cargo
baseline: latest
status: verified
triggers:
  keywords: ["cargo", "metadata", "enable", "clippy", "published", "crates"]
  files: ["**/*.rs"]
related: ["rust-doc-cargo-metadata", "rust-proj-workspace-deps", "rust-lint-deny-correctness"]
sources:
  - title: "rust-skills: lint-cargo-metadata"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-cargo-metadata.md
---
> Enable clippy::cargo for published crates

## Why

The `clippy::cargo` lint group checks Cargo.toml for issues that affect publishing and dependency management. For crates intended for crates.io, these checks help ensure a professional, well-configured package.

## Bad

```rust
// ### Missing Metadata
// # WARN: missing package.description
// # WARN: missing package.license or package.license-file
// # WARN: missing package.repository
// [package]
// name = "my-crate"
// version = "0.1.0"

// ### Dependency Issues
// # WARN: feature used but not defined
// # WARN: dependency version not specified
// [dependencies]
// serde = "*"  # Bad: any version
// tokio = { git = "https://example.com/tokio" }  # WARN for published crates

// ### Feature Issues
// # WARN: negative_feature_names
// [features]
// no-std = []  # Should be: std = [] (opt-out vs opt-in)

// # WARN: redundant_feature_names
// [features]
// default = ["feature-a"]
// feature-a = []  # Feature name matches crate name
```

## Good

```rust
// # Cargo.toml
// [lints.clippy]
// cargo = "warn"

// Or in code:

#![warn(clippy::cargo)]
```

## See Also

- [rust-doc-cargo-metadata](doc-cargo-metadata.md) - Cargo.toml metadata
- [rust-proj-workspace-deps](proj-workspace-deps.md) - Workspace dependencies
- [rust-lint-deny-correctness](lint-deny-correctness.md) - Correctness lints
