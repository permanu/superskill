---
id: rust-api-operator-overload
lang: rust
prefix: api
title: "Overload operators only when the semantics are natural and unsurprising"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["operator", "overload", "operators", "semantics", "natural", "unsurprising"]
  files: ["**/*.rs"]
related: ["rust-type-newtype-ids", "rust-api-common-traits"]
sources:
  - title: "rust-skills: api-operator-overload"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-operator-overload.md
---
> Overload operators only when the semantics are natural and unsurprising

## Why

Rust allows operator overloading through traits in `std::ops` (`Add`, `Sub`, `Mul`, `Index`, `Neg`, etc.). The Rust API Guidelines (C-OVERLOAD) permit this — but only when the operator meaning is immediately obvious to any reader. Natural fits: arithmetic on numeric newtypes, vector/matrix math, set union/intersection with `+`/`|`, duration arithmetic. Surprising overloads — `+` that mutates state, `*` that performs a network call, `Index` that panics unconditionally — mislead readers and violate the principle of least surprise. When in doubt, name a method instead. Also implement the operator for references to avoid forcing callers to clone.

## Bad

```rust
use std::ops::Add;

struct Logger(Vec<String>);

// Anti-pattern: + mutates internal state and has a side effect
impl Add<String> for Logger {
    type Output = Logger;

    fn add(mut self, msg: String) -> Logger {
        self.0.push(msg.clone());
        println!("logged: {msg}"); // side effect in an operator
        self
    }
}
```

## Good

```rust
use std::ops::Add;

#[derive(Debug, Clone, Copy, PartialEq)]
struct Vector2 { x: f64, y: f64 }

// Natural, unsurprising semantics: + adds component-wise
impl Add for Vector2 {
    type Output = Vector2;
    fn add(self, rhs: Vector2) -> Vector2 {
        Vector2 { x: self.x + rhs.x, y: self.y + rhs.y }
    }
}

// Also implement for references — avoids forcing callers to clone
impl Add for &Vector2 {
    type Output = Vector2;
    fn add(self, rhs: &Vector2) -> Vector2 {
        *self + *rhs
    }
}
fn main() {
    let (a, b) = (Vector2 { x: 1.0, y: 2.0 }, Vector2 { x: 3.0, y: 4.0 });
    assert_eq!(a + b, Vector2 { x: 4.0, y: 6.0 });
    assert_eq!(&a + &b, Vector2 { x: 4.0, y: 6.0 });
}
```

## See Also

- [rust-type-newtype-ids](type-newtype-ids.md) - Wrapping values in newtypes that may need operators
- [rust-api-common-traits](api-common-traits.md) - implement `Debug`, `Clone`, `PartialEq` eagerly
