---
id: rust-lint-rustfmt-check
lang: rust
prefix: lint
title: "Run cargo fmt --check in CI"
severity: should
enforce: tool
tool: rustfmt
baseline: latest
status: verified
triggers:
  keywords: ["rustfmt", "check", "run", "cargo", "fmt", "--check"]
  files: ["**/*.rs"]
related: ["rust-lint-warn-style", "rust-lint-pedantic-selective", "rust-name-funcs-snake"]
sources:
  - title: "rust-skills: lint-rustfmt-check"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-rustfmt-check.md
---
> Run cargo fmt --check in CI

## Why

Consistent formatting eliminates style debates and makes diffs cleaner. Running `cargo fmt --check` in CI ensures all code follows the same format. This catches formatting issues before merge, not after.

## Bad

```rust
// In `rustfmt.toml`:

// # Skip generated files
// ignore = [
//     "src/generated/*",
//     "build.rs",
// ]

// Or in code:

#[rustfmt::skip]
mod generated_code {}

#[rustfmt::skip]
const MATRIX: [[i32; 4]; 4] = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
];
```

## Good

```rust
// ### GitHub Actions
// name: CI
// on: [push, pull_request]
// jobs:
//   fmt:
//     runs-on: ubuntu-latest
//     steps:
//       - uses: actions/checkout@v4
//       - uses: dtolnay/rust-toolchain@stable
//         with:
//           components: rustfmt
//       - run: cargo fmt --all --check

// ### GitLab CI
// fmt:
//   image: rust:latest
//   script:
//     - rustup component add rustfmt
//     - cargo fmt --all --check

// ### Pre-commit hook (.git/hooks/pre-commit)
// #!/bin/sh
// cargo fmt --all --check
```

## See Also

- [rust-lint-warn-style](lint-warn-style.md) - Style lints
- [rust-lint-pedantic-selective](lint-pedantic-selective.md) - Pedantic lints
- [rust-name-funcs-snake](name-funcs-snake.md) - Naming conventions
