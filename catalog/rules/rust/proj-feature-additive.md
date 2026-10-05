---
id: rust-proj-feature-additive
lang: rust
prefix: proj
title: "Design Cargo features to be strictly additive"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["feature", "additive", "design", "cargo", "features", "strictly"]
  files: ["**/*.rs"]
related: ["rust-api-serde-optional", "rust-proj-workspace-deps", "rust-lint-cfg-check"]
sources:
  - title: "rust-skills: proj-feature-additive"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/proj-feature-additive.md
---
> Design Cargo features to be strictly additive

## Why

Cargo unifies features across the dependency graph: if any crate in the build enables a feature, every consumer of that crate gets it. A feature that removes or changes existing behavior will break crates that depend on the baseline behavior the moment a third dependency enables it. Features must only add capability — new trait impls, additional dependencies, optional integrations — never subtract. Mutually exclusive features are an anti-pattern in the Cargo model.

## Bad

```rust
// [features]
// # "no_std" disables std — enabling it REMOVES behavior
// no_std = []

// [dependencies]
// # and somewhere in lib.rs:
// # #[cfg(not(feature = "no_std"))]
// # use std::collections::HashMap;

// lib.rs — toggling off std via a feature is non-additive
#[cfg(not(feature = "no_std"))]
use std::vec::Vec;

#[cfg(feature = "no_std")]
use alloc::vec::Vec;
```

## Good

```rust
// [features]
// # "std" ADDS std support; no_std is the baseline
// default = ["std"]
// std = []

// # Optional integrations — purely additive
// serde = ["dep:serde"]
// tokio = ["dep:tokio"]

// [dependencies]
// serde = { version = "1", optional = true }
// tokio = { version = "1", optional = true }

// lib.rs — std is opt-in, no_std is the default baseline
#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

#[cfg(feature = "std")]
use std::vec::Vec;

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;
```

## See Also

- [rust-api-serde-optional](api-serde-optional.md) - gate Serialize/Deserialize behind a feature flag
- [rust-proj-workspace-deps](proj-workspace-deps.md) - Use workspace dependency inheritance
- [rust-lint-cfg-check](lint-cfg-check.md) - Catch feature-gate typos with unexpected_cfgs
