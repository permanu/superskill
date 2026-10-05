---
id: rust-api-common-traits
lang: rust
prefix: api
title: "Implement standard traits (Debug, Clone, PartialEq, etc.) for public types"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["common", "traits", "implement", "standard", "debug", "clone", "partialeq", "etc"]
  files: ["**/*.rs"]
related: ["rust-own-copy-small", "rust-api-default-impl", "rust-doc-examples-section", "rust-type-display-vs-debug"]
sources:
  - title: "rust-skills: api-common-traits"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-common-traits.md
---
> Implement standard traits (Debug, Clone, PartialEq, etc.) for public types

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates the errors from missing `Debug`, `PartialEq`, `Hash`, and `Clone` implementations).

Standard traits make your types interoperable with the Rust ecosystem. `Debug` enables `println!("{:?}")` and error messages. `Clone` allows explicit duplication. `PartialEq` enables `==`. Without these, users can't use your types in common patterns like testing, collections, or debugging.

## Bad

```rust
// Bare struct - severely limited usability
pub struct Point {
    pub x: f64,
    pub y: f64,
}

// Can't debug
println!("{:?}", point);  // Error: Debug not implemented

// Can't compare
if point1 == point2 { }  // Error: PartialEq not implemented

// Can't use in HashMap
let mut map: HashMap<Point, Value> = HashMap::new();  // Error: Hash not implemented

// Can't clone
let copy = point.clone();  // Error: Clone not implemented
```

## Good

```rust
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

// For hashable types
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct UserId(u64);

struct User;

fn main() {
    let point = Point { x: 1.0, y: 2.0 };
    let same = Point { x: 1.0, y: 2.0 };
    // Now everything works
    println!("{:?}", point);
    assert_eq!(point, same);
    let copy = point; // Copy, not just Clone
    let _ = copy;
    let mut map: HashMap<UserId, User> = HashMap::new();
    map.insert(UserId(1), User);
}
```

## See Also

- [rust-own-copy-small](own-copy-small.md) - When to implement Copy
- [rust-api-default-impl](api-default-impl.md) - Implementing Default
- [rust-doc-examples-section](doc-examples-section.md) - Documenting trait implementations
- [rust-type-display-vs-debug](type-display-vs-debug.md) - Display vs Debug responsibilities
