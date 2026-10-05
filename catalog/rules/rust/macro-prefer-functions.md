---
id: rust-macro-prefer-functions
lang: rust
prefix: macro
title: "Reach for a macro only when a function or generic cannot express it"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["functions", "reach", "macro", "function", "generic", "cannot", "express"]
  files: ["**/*.rs"]
related: ["rust-anti-over-abstraction", "rust-type-generic-bounds", "rust-macro-rules-hygiene"]
sources:
  - title: "rust-skills: macro-prefer-functions"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/macro-prefer-functions.md
---
> Reach for a macro only when a function or generic cannot express it

## Why

Macros operate on token streams before type checking, so they bypass type inference, resist IDE navigation, and produce opaque error messages. They also slow incremental compilation and cannot be passed as values. A generic function is almost always clearer, better-optimized by the compiler, and easier for contributors to reason about.

Reach for a macro only when you genuinely need one of: variadic argument counts, a DSL with non-Rust syntax, blanket trait impls across an open-ended set of types, compile-time format/string checks, or eliminating mechanically repetitive boilerplate that a function truly cannot handle.

## Bad

```rust
// Nothing here requires a macro — no variadic args, no DSL, no trait impl.
macro_rules! double {
    ($x:expr) => {
        $x * 2
    };
}

fn main() {
    let n = double!(21);
    println!("{n}");
}
```

## Good

```rust
// A generic function is clearer, debuggable, and just as efficient.
#[inline]
fn double<T>(x: T) -> T
where
    T: std::ops::Mul<Output = T> + Copy,
{
    x * x  // or x + x for integer-like types
}

fn main() {
    let n = double(21_i32);
    println!("{n}");
}
```

## See Also

- [rust-anti-over-abstraction](anti-over-abstraction.md) - Avoid unnecessary abstraction layers
- [rust-type-generic-bounds](type-generic-bounds.md) - Add trait bounds only where needed
- [rust-macro-rules-hygiene](macro-rules-hygiene.md) - Hygiene and `$crate` for declarative macros
