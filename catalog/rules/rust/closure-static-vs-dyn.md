---
id: rust-closure-static-vs-dyn
lang: rust
prefix: closure
title: "Accept `impl Fn` (generic) for hot callbacks; use `&dyn Fn`/`Box<dyn Fn>` to cut code size or to store them"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["static", "dyn", "accept", "impl", "generic", "hot", "callbacks", "box"]
  files: ["**/*.rs"]
  symbols: ["Box"]
related: ["rust-anti-type-erasure", "rust-type-generic-bounds", "rust-closure-fn-trait-bounds"]
sources:
  - title: "rust-skills: closure-static-vs-dyn"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/closure-static-vs-dyn.md
---
> Accept `impl Fn` (generic) for hot callbacks; use `&dyn Fn`/`Box<dyn Fn>` to cut code size or to store them

## Why

A generic parameter over a closure (`F: Fn(T) -> U`, or `impl Fn`) monomorphizes at each call site: the compiler emits a specialized copy of the function, enabling inlining and zero-cost dispatch. The trade-off is binary bloat when many different closure types are substituted. `&dyn Fn`/`Box<dyn Fn>` share a single compiled copy via a vtable, which reduces code size and is the only option for storing heterogeneous closures (e.g. an event handler registry). Choose by profiling requirements, not habit.

## Bad

```rust
// Storing closures generically in a struct is impossible — the struct
// would need a type parameter per handler, making it unusable.
struct BadRegistry<F: Fn(&str)> {
    // Can only hold ONE concrete closure type — defeats the purpose.
    handler: F,
}

// Equally, using Box<dyn Fn> on a hot, single-call-site inner loop
// pays a vtable cost for no benefit.
fn transform_slow(xs: &[i32], f: &dyn Fn(i32) -> i32) -> Vec<i32> {
    xs.iter().map(|&x| f(x)).collect()
}
```

## Good

```rust
// Generic / static dispatch: preferred for hot paths — inlinable, zero allocation.
fn transform<F: Fn(i32) -> i32>(xs: &[i32], f: F) -> Vec<i32> {
    xs.iter().map(|&x| f(x)).collect()
}

// Dynamic dispatch: required when storing heterogeneous closures.
struct Registry {
    handlers: Vec<Box<dyn Fn(&str)>>,
}

fn demo() {
    // Static dispatch — the compiler may inline the closure entirely.
    let doubled = transform(&[1, 2, 3], |x| x * 2);
    assert_eq!(doubled, vec![2, 4, 6]);

    // Dynamic dispatch — one compiled copy, heterogeneous handlers.
    let mut reg = Registry { handlers: Vec::new() };
    reg.handlers.push(Box::new(|e| println!("logger: {e}")));
    reg.handlers.push(Box::new(|e| println!("metrics: {e}")));
    for handler in &reg.handlers {
        handler("user_signup");
    }
}
```

## See Also

- [rust-anti-type-erasure](anti-type-erasure.md) - prefer `impl Trait` over `Box<dyn Trait>` when possible
- [rust-type-generic-bounds](type-generic-bounds.md) - Add trait bounds only where needed
- [rust-closure-fn-trait-bounds](closure-fn-trait-bounds.md) - choose the weakest `Fn` trait
