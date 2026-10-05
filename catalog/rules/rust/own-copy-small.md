---
id: rust-own-copy-small
lang: rust
prefix: own
title: "Implement `Copy` for small, simple types"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["copy", "small", "implement", "simple", "types"]
  files: ["**/*.rs"]
  symbols: ["Copy"]
related: ["rust-own-clone-explicit", "rust-type-newtype-ids"]
sources:
  - title: "rust-skills: own-copy-small"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-copy-small.md
---
> Implement `Copy` for small, simple types

## Why

Types that implement `Copy` are implicitly duplicated on assignment instead of moved. This eliminates the need for explicit `.clone()` calls and makes the code more ergonomic. For small types (generally ≤16 bytes), copying is as fast or faster than moving a pointer.

## Bad

```rust
// Small type without Copy - requires explicit clone
#[derive(Clone, Debug)]
struct Point {
    x: f64,
    y: f64,
}

fn distance(p1: Point, p2: Point) -> f64 {
    ((p2.x - p1.x).powi(2) + (p2.y - p1.y).powi(2)).sqrt()
}

fn main() {
    let origin = Point { x: 0.0, y: 0.0 };
    let target = Point { x: 3.0, y: 4.0 };

    let d1 = distance(origin.clone(), target.clone()); // Tedious
    let d2 = distance(origin.clone(), target.clone()); // Every use needs clone
    // origin and target still usable but verbose
    println!("{} {}", d1, d2);
}
```

## Good

```rust
// Small type with Copy - implicit duplication
#[derive(Clone, Copy, Debug)]
struct Point {
    x: f64,
    y: f64,
}

fn distance(p1: Point, p2: Point) -> f64 {
    ((p2.x - p1.x).powi(2) + (p2.y - p1.y).powi(2)).sqrt()
}

fn main() {
    let origin = Point { x: 0.0, y: 0.0 };
    let target = Point { x: 3.0, y: 4.0 };

    let d1 = distance(origin, target); // Implicitly copied
    let d2 = distance(origin, target); // Still works!
    // origin and target remain valid
    println!("{} {}", d1, d2);
}
```

## See Also

- [rust-own-clone-explicit](own-clone-explicit.md) - When Clone without Copy is appropriate
- [rust-type-newtype-ids](type-newtype-ids.md) - Newtype pattern over Copy types
