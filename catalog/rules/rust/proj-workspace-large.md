---
id: rust-proj-workspace-large
lang: rust
prefix: proj
title: "Use workspaces for large projects"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["workspace", "large", "workspaces", "projects"]
  files: ["**/*.rs"]
related: ["rust-proj-workspace-deps", "rust-proj-bin-dir", "rust-proj-lib-main-split"]
sources:
  - title: "rust-skills: proj-workspace-large"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-workspace-large.md
---
> Use workspaces for large projects

## Why

Cargo workspaces manage multiple related crates under one repository. They share a single `Cargo.lock`, build cache, and can be versioned together. For large projects, workspaces improve build times, enforce modularity, and simplify dependency management.

## Bad

```rust
// # Separate repositories for each crate
// my-app-core/
// my-app-cli/
// my-app-server/
// my-app-common/

// # Each has its own Cargo.lock
// # Dependencies may drift
// # Cross-crate development is painful
```

## Good

```rust
// my-app/
// ├── Cargo.toml          # Workspace root
// ├── Cargo.lock          # Shared lock file
// ├── crates/
// │   ├── core/
// │   │   ├── Cargo.toml
// │   │   └── src/
// │   ├── cli/
// │   │   ├── Cargo.toml
// │   │   └── src/
// │   ├── server/
// │   │   ├── Cargo.toml
// │   │   └── src/
// │   └── common/
// │       ├── Cargo.toml
// │       └── src/
// └── README.md
```

## See Also

- [rust-proj-workspace-deps](proj-workspace-deps.md) - Workspace dependencies
- [rust-proj-bin-dir](proj-bin-dir.md) - Multiple binaries
- [rust-proj-lib-main-split](proj-lib-main-split.md) - Lib/main separation
