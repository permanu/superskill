---
id: rust-lint-cfg-check
lang: rust
prefix: lint
title: "Enable `unexpected_cfgs` and declare known cfgs to catch feature-gate typos"
severity: should
enforce: tool
tool: rustc::unexpected_cfgs
baseline: latest
status: verified
triggers:
  keywords: ["cfg", "check", "enable", "unexpected_cfgs", "declare", "known", "cfgs", "catch"]
  files: ["**/*.rs"]
  symbols: ["unexpected_cfgs"]
related: ["rust-lint-workspace-lints", "rust-proj-feature-additive", "rust-lint-warn-suspicious"]
sources:
  - title: "rust-skills: lint-cfg-check"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-cfg-check.md
---
> Enable `unexpected_cfgs` and declare known cfgs to catch feature-gate typos

## Why

A typo in a cfg expression — `#[cfg(feature = "serde_")]` instead of `"serde"`, or `#[cfg(tokio_unstable)]` with no declaration — compiles silently and produces dead code or an always-disabled feature. The `unexpected_cfgs` lint flags any cfg name or value not known to the compiler. Cargo automatically teaches the compiler about your declared feature names; for custom cfgs (well-known ones like `tokio_unstable`, or your own) you must declare them via `check-cfg` in the `[lints.rust]` table. This catches bugs at compile time that would otherwise be invisible.

## Bad

```rust
// Typo: "serde_" will never match the "serde" feature.
// Compiles with no warning — the block is silently dead.
#[cfg(feature = "serde_")]
impl serde::Serialize for MyType {}

// Custom cfg used without declaration — also silently ignored.
#[cfg(tokio_unstable)]
pub fn experimental() {}
```

## Good

```rust
// # Cargo.toml — declare custom cfgs in the lints table
// [lints.rust]
// unexpected_cfgs = { level = "warn", check-cfg = [
//     'cfg(tokio_unstable)',
//     'cfg(coverage_nightly)',
// ] }

// Now "serde_" typo → compiler warning: unexpected `cfg` condition value
// and tokio_unstable is a known cfg, so it compiles cleanly.
#[cfg(feature = "serde")]      // correct
impl serde::Serialize for MyType {}

#[cfg(tokio_unstable)]         // declared above — no warning
pub fn experimental() {}
```

## See Also

- [rust-lint-workspace-lints](lint-workspace-lints.md) - Configure lints at workspace level
- [rust-proj-feature-additive](proj-feature-additive.md) - Design features to be strictly additive
- [rust-lint-warn-suspicious](lint-warn-suspicious.md) - Enable suspicious lint group
