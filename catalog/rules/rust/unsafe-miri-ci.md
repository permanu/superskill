---
id: rust-unsafe-miri-ci
lang: rust
prefix: unsafe
title: "Run `cargo miri test` in CI for every crate that contains `unsafe` code."
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["miri", "run", "cargo", "test", "crate", "contains", "unsafe", "code"]
  files: ["**/*.rs"]
related: ["rust-unsafe-maybeuninit", "rust-unsafe-safety-comment", "rust-test-criterion-bench"]
sources:
  - title: "rust-skills: unsafe-miri-ci"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/unsafe-miri-ci.md
---
> Run `cargo miri test` in CI for every crate that contains `unsafe` code.

## Why

Miri is the only tool that *dynamically* detects undefined behavior in Rust programs at test time. It catches out-of-bounds memory accesses, use-after-free, reads of uninitialized memory, invalid pointer provenance, data races in `unsafe` multithreaded code, and violations of the Stacked Borrows / Tree Borrows aliasing models. The Rust standard library, tokio, serde, and many foundational crates all run Miri in CI before merging changes that touch unsafe code.

Static analysis and code review can miss subtle UB that only manifests at specific memory layouts; Miri's interpreted execution catches it unconditionally.

## Bad

```rust
// # CI that tests but never runs Miri — unsafe code ships unverified.
// - name: Test
//   run: cargo test --all-features
```

## Good

```rust
// # .github/workflows/miri.yml
// name: Miri

// on: [push, pull_request]

// jobs:
//   miri:
//     name: Miri (nightly)
//     runs-on: ubuntu-latest
//     steps:
//       - uses: actions/checkout@v4

//       - name: Install nightly toolchain with Miri
//         run: |
//           rustup toolchain install nightly --component miri
//           rustup override set nightly
//           cargo miri setup

//       - name: Run Miri
//         env:
//           MIRIFLAGS: "-Zmiri-strict-provenance"
//         run: cargo miri test --all-features
```

## See Also

- [rust-unsafe-maybeuninit](unsafe-maybeuninit.md) - use `MaybeUninit<T>` for uninitialized memory
- [rust-unsafe-safety-comment](unsafe-safety-comment.md) - Document every unsafe block
- [rust-test-criterion-bench](test-criterion-bench.md) - use criterion for benchmarking (separate from Miri)
