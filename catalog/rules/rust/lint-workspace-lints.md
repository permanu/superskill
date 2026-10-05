---
id: rust-lint-workspace-lints
lang: rust
prefix: lint
title: "Configure lints at workspace level for consistent enforcement"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["workspace", "lints", "configure", "level", "consistent", "enforcement"]
  files: ["**/*.rs"]
related: ["rust-lint-deny-correctness", "rust-proj-workspace-deps", "rust-anti-unwrap-abuse"]
sources:
  - title: "rust-skills: lint-workspace-lints"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-workspace-lints.md
---
> Configure lints at workspace level for consistent enforcement

## Why

Without centralized lint configuration, each crate develops its own standards (or none). Workspace-level lints ensure consistent code quality across all crates. Denied lints catch issues in CI before they reach production.

## Bad

```rust
// # crate-a/Cargo.toml - strict
// [lints.clippy]
// unwrap_used = "deny"

// # crate-b/Cargo.toml - lenient
// # No lint config

// # crate-c/Cargo.toml - different
// [lints.clippy]
// unwrap_used = "warn"

// # Inconsistent enforcement, some issues slip through
```

## Good

```rust
// # Root Cargo.toml
// [workspace.lints.rust]
// unsafe_code = "deny"
// missing_docs = "warn"

// [workspace.lints.clippy]
// # Correctness
// unwrap_used = "deny"
// expect_used = "warn"
// panic = "deny"
// # Style
// needless_pass_by_value = "warn"
// redundant_clone = "warn"

// [workspace.lints.rustdoc]
// broken_intra_doc_links = "deny"

// # crate-a/Cargo.toml
// [lints]
// workspace = true

// # crate-b/Cargo.toml
// [lints]
// workspace = true
```

## See Also

- [rust-lint-deny-correctness](lint-deny-correctness.md) - Critical lints
- [rust-proj-workspace-deps](proj-workspace-deps.md) - Workspace configuration
- [rust-anti-unwrap-abuse](anti-unwrap-abuse.md) - Unwrap lints
