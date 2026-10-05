---
id: rust-closure-impl-fn-return
lang: rust
prefix: closure
title: "Return closures as `impl Fn`/`FnMut`/`FnOnce`, not `Box<dyn Fn>`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["impl", "return", "closures", "fnmut", "fnonce", "box", "dyn"]
  files: ["**/*.rs"]
  symbols: ["FnMut", "FnOnce", "Box"]
related: ["rust-anti-type-erasure", "rust-closure-static-vs-dyn"]
sources:
  - title: "rust-skills: closure-impl-fn-return"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/closure-impl-fn-return.md
---
> Return closures as `impl Fn`/`FnMut`/`FnOnce`, not `Box<dyn Fn>`

## Why

`impl Fn` in return position names the closure's concrete (but unnameable) type and enables static dispatch with no heap allocation. `Box<dyn Fn>` adds an allocation and a virtual call every time the closure is invoked. The opaque `impl Trait` syntax was designed precisely for this use case. Reach for `Box<dyn Fn>` only when the function must return *different* closure types depending on runtime conditions, or when the closure must be stored in a struct field or collection.

## Bad

```rust
// Allocates on the heap for no benefit — single concrete closure type.
fn adder_bad(n: i32) -> Box<dyn Fn(i32) -> i32> {
    Box::new(move |x| x + n)
}

fn multiplier_bad(n: i32) -> Box<dyn Fn(i32) -> i32> {
    Box::new(move |x| x * n)
}
```

## Good

```rust
// Zero allocation, statically dispatched.
fn adder(n: i32) -> impl Fn(i32) -> i32 {
    move |x| x + n
}

fn multiplier(n: i32) -> impl Fn(i32) -> i32 {
    move |x| x * n
}

fn apply(f: impl Fn(i32) -> i32, value: i32) -> i32 {
    f(value)
}

fn demo() {
    let add5 = adder(5);
    let mul3 = multiplier(3);

    assert_eq!(apply(add5, 10), 15);
    assert_eq!(apply(mul3, 10), 30);
}
```

## See Also

- [rust-anti-type-erasure](anti-type-erasure.md) - avoid `Box<dyn Trait>` when `impl Trait` works
- [rust-closure-static-vs-dyn](closure-static-vs-dyn.md) - Static vs dynamic dispatch trade-offs for callbacks
