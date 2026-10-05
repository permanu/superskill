---
id: rust-proj-msrv-declare
lang: rust
prefix: proj
title: "Declare `rust-version` (MSRV) in Cargo.toml and test it in CI"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["msrv", "declare", "rust-version", "cargo", "toml", "test"]
  files: ["**/*.rs"]
related: ["rust-proj-workspace-deps", "rust-lint-cargo-metadata", "rust-doc-cargo-metadata"]
sources:
  - title: "rust-skills: proj-msrv-declare"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-msrv-declare.md
---
> Declare `rust-version` (MSRV) in Cargo.toml and test it in CI

## Why

Setting `package.rust-version` causes Cargo to emit a clear, actionable error when the installed toolchain is too old, instead of a cryptic type or feature error deep inside your code. The 2024-edition resolver (resolver = "3", the default for edition 2024) is MSRV-aware: it will avoid selecting dependency versions whose own `rust-version` field exceeds yours, preventing accidental MSRV breakage from transitive upgrades. Without a declared MSRV, you have no contract with downstream users and no CI gate to catch regressions.

## Bad

```rust
// [package]
// name = "my-crate"
// version = "0.1.0"
// edition = "2021"
// # no rust-version — users get cryptic errors on old toolchains,
// # and nothing prevents a dep bump from silently raising the floor
```

## Good

```rust
// [package]
// name = "my-crate"
// version = "0.1.0"
// edition = "2024"
// rust-version = "1.80"  # oldest toolchain you commit to supporting

// [workspace]
// resolver = "3"  # default for edition 2024; enables MSRV-aware dep resolution

// CI job pinning the MSRV toolchain (GitHub Actions example):

// # .github/workflows/msrv.yml
// - name: Install MSRV toolchain
//   uses: dtolnay/rust-toolchain@master
//   with:
//     toolchain: "1.80"

// - name: Check MSRV
//   run: cargo check --all-features
```

## See Also

- [rust-proj-workspace-deps](proj-workspace-deps.md) - Use workspace dependency inheritance
- [rust-lint-cargo-metadata](lint-cargo-metadata.md) - warn on missing Cargo.toml metadata
- [rust-doc-cargo-metadata](doc-cargo-metadata.md) - fill Cargo.toml metadata fields
