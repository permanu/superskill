---
id: rust-trait-coherence-newtype
lang: rust
prefix: trait
title: "Respect the orphan rule; wrap a foreign type in a newtype to implement a foreign trait on it"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["coherence", "newtype", "respect", "orphan", "rule", "wrap", "foreign", "type"]
  files: ["**/*.rs"]
related: ["rust-api-newtype-safety", "rust-type-repr-transparent", "rust-trait-blanket-impl", "rust-api-from-not-into"]
sources:
  - title: "rust-skills: trait-coherence-newtype"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/trait-coherence-newtype.md
---
> Respect the orphan rule; wrap a foreign type in a newtype to implement a foreign trait on it

## Why

Rust's coherence rules — enforced by the orphan rule — require that for any `impl Trait for Type`, either `Trait` or `Type` must be defined in the current crate. This prevents two crates from providing conflicting implementations for the same (trait, type) pair, which would make the compiler unable to pick one. When you need to implement a trait you didn't define (e.g., `std::fmt::Display`) on a type you didn't define (e.g., `Vec<i32>`), the compiler rejects the impl outright. The solution is to wrap the foreign type in a local newtype struct, then implement the foreign trait on the wrapper. Marking the wrapper `#[repr(transparent)]` keeps it zero-cost and allows safe pointer casts where needed.

## Bad

```rust
use std::fmt;

// error[E0117]: only traits defined in the current crate can be implemented for
// types defined outside of the crate
// impl fmt::Display for Vec<i32> is rejected here: both Display and Vec are foreign
```

## Good

```rust
use std::fmt;

// A local newtype wrapping the foreign type; repr(transparent) keeps layout.
#[repr(transparent)]
struct CommaSeparated(Vec<i32>);

// Display is foreign, CommaSeparated is local: the orphan rule is satisfied.
impl fmt::Display for CommaSeparated {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let parts: Vec<String> = self.0.iter().map(|n| n.to_string()).collect();
        write!(f, "{}", parts.join(", "))
    }
}

impl From<Vec<i32>> for CommaSeparated {
    fn from(v: Vec<i32>) -> Self { Self(v) }
}

fn demo() {
    let nums = CommaSeparated::from(vec![1, 2, 3]);
    println!("{nums}"); // 1, 2, 3
}
```

## See Also

- [rust-api-newtype-safety](api-newtype-safety.md) - Use newtypes for type-safe distinctions
- [rust-type-repr-transparent](type-repr-transparent.md) - use `#[repr(transparent)]` for FFI newtypes
- [rust-trait-blanket-impl](trait-blanket-impl.md) - Give behaviour to every type meeting a bound
- [rust-api-from-not-into](api-from-not-into.md) - implement `From`, not `Into` (auto-derived)
