---
id: rust-type-phantom-marker
lang: rust
prefix: type
title: "Use `PhantomData` to express type relationships without runtime cost"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["phantom", "marker", "phantomdata", "express", "type", "relationships", "without", "runtime"]
  files: ["**/*.rs"]
  symbols: ["PhantomData"]
related: ["rust-api-typestate", "rust-api-newtype-safety", "rust-type-newtype-ids"]
sources:
  - title: "rust-skills: type-phantom-marker"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-phantom-marker.md
---
> Use `PhantomData` to express type relationships without runtime cost

## Why

> Note: the Bad snippet intentionally does not compile (demonstrates E0392: type parameter `T` is never used).

Sometimes your type needs to be parameterized by a type that doesn't appear in any field—for variance, drop order, or semantic purposes. `PhantomData<T>` tells the compiler your type is "associated with" `T` without storing any `T` data. It has zero runtime cost.

## Bad

```rust
// Type parameter unused - compiler error
struct Handle<T> {
    id: u64,
    // Error: parameter `T` is never used
}

// Workaround with unnecessary storage
struct Handle<T> {
    id: u64,
    _type: Option<T>,  // Wastes memory, requires T: Default
}
```

## Good

```rust
use std::marker::PhantomData;

struct Handle<T> {
    id: u64,
    _marker: PhantomData<T>,  // Zero-size, tells compiler about T
}

impl<T> Handle<T> {
    fn new(id: u64) -> Self {
        Handle { id, _marker: PhantomData }
    }
}

// Different Handle types are incompatible
struct User;
struct Order;

fn process_user(h: Handle<User>) { let _ = h; }

fn main() {
    let user_handle = Handle::<User>::new(1);
    let order_handle = Handle::<Order>::new(2);
    process_user(user_handle);
    // process_user(order_handle);  // Error: expected Handle<User>
}
```

## See Also

- [rust-api-typestate](api-typestate.md) - State machine pattern
- [rust-api-newtype-safety](api-newtype-safety.md) - Type-safe wrappers
- [rust-type-newtype-ids](type-newtype-ids.md) - ID types
