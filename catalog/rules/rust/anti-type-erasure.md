---
id: rust-anti-type-erasure
lang: rust
prefix: anti
title: "Don't use Box<dyn Trait> when impl Trait works"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["type", "erasure", "don", "box", "dyn", "trait", "impl", "works"]
  files: ["**/*.rs"]
related: ["rust-anti-over-abstraction", "rust-type-generic-bounds", "rust-mem-box-large-variant", "rust-trait-dyn-vs-generic", "rust-closure-static-vs-dyn"]
sources:
  - title: "rust-skills: anti-type-erasure"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-type-erasure.md
---
> Don't use Box<dyn Trait> when impl Trait works

## Why

`Box<dyn Trait>` (type erasure) introduces heap allocation and dynamic dispatch overhead. When you have a single concrete type or can use generics, `impl Trait` provides the same flexibility with zero overhead through monomorphization.

## Bad

```rust
trait Shape { fn area(&self) -> f64; }
struct Circle;

impl Shape for Circle {
    fn area(&self) -> f64 { 1.0 }
}

// Unnecessary type erasure
fn get_iterator() -> Box<dyn Iterator<Item = i32>> {
    Box::new((0..10).map(|x| x * 2))
}

// Boxing for no reason
fn make_handler() -> Box<dyn Fn(i32) -> i32> {
    Box::new(|x| x + 1)
}

// Boxed trait objects when one concrete type would do
fn get_shapes() -> Vec<Box<dyn Shape>> {
    vec![Box::new(Circle) as Box<dyn Shape>]
}
```

## Good

```rust
trait Shape { fn area(&self) -> f64; }
struct Circle;
struct Square;
impl Shape for Circle { fn area(&self) -> f64 { 1.0 } }
impl Shape for Square { fn area(&self) -> f64 { 2.0 } }

// impl Trait: zero overhead, no allocation
fn get_iterator() -> impl Iterator<Item = i32> {
    (0..10).map(|x| x * 2)
}

// impl Fn: no boxing
fn make_handler() -> impl Fn(i32) -> i32 {
    |x| x + 1
}

// Truly mixed types at runtime: Box<dyn> is appropriate
fn make_shapes(kinds: &[bool]) -> Vec<Box<dyn Shape>> {
    kinds.iter().map(|&is_round| {
        if is_round { Box::new(Circle) as Box<dyn Shape> } else { Box::new(Square) as Box<dyn Shape> }
    }).collect()
}
```

## See Also

- [rust-anti-over-abstraction](anti-over-abstraction.md) - Excessive generics
- [rust-type-generic-bounds](type-generic-bounds.md) - Generic constraints
- [rust-mem-box-large-variant](mem-box-large-variant.md) - Boxing enum variants
- [rust-trait-dyn-vs-generic](trait-dyn-vs-generic.md) - Choose dispatch deliberately
- [rust-closure-static-vs-dyn](closure-static-vs-dyn.md) - Same tradeoff for closures
