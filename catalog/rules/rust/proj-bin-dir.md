---
id: rust-proj-bin-dir
lang: rust
prefix: proj
title: "Put multiple binaries in src/bin/"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["bin", "dir", "put", "multiple", "binaries", "src"]
  files: ["**/*.rs"]
related: ["rust-proj-lib-main-split", "rust-proj-workspace-large", "rust-proj-flat-small"]
sources:
  - title: "rust-skills: proj-bin-dir"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-bin-dir.md
---
> Put multiple binaries in src/bin/

## Why

When a crate produces multiple binaries, placing them in `src/bin/` keeps the project organized. Each file becomes a separate binary target automatically, without manual `Cargo.toml` configuration.

## Bad

```rust
// my-project/
// ├── Cargo.toml        # Complex [[bin]] sections for each binary
// ├── src/
// │   ├── main.rs       # Which binary is this?
// │   ├── server.rs     # Is this a module or binary?
// │   ├── cli.rs        # Unclear
// │   └── lib.rs

// # Cargo.toml - verbose and error-prone
// [[bin]]
// name = "server"
// path = "src/server.rs"

// [[bin]]
// name = "cli"
// path = "src/cli.rs"
```

## Good

```rust
// my-project/
// ├── Cargo.toml        # Clean, no [[bin]] needed
// ├── src/
// │   ├── lib.rs        # Shared library code
// │   └── bin/
// │       ├── server.rs # Binary: my-project-server (or just server)
// │       └── cli.rs    # Binary: my-project-cli (or just cli)

// Each file in `src/bin/` automatically becomes a binary named after the file.
```

## See Also

- [rust-proj-lib-main-split](proj-lib-main-split.md) - Keep main.rs minimal
- [rust-proj-workspace-large](proj-workspace-large.md) - Workspace for larger projects
- [rust-proj-flat-small](proj-flat-small.md) - Simple project structure
