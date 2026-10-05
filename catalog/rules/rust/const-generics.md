---
id: rust-const-generics
lang: rust
prefix: const
title: "Parameterize over values with const generics `<const N: usize>`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["generics", "parameterize", "values", "const", "usize"]
  files: ["**/*.rs"]
related: ["rust-const-fn", "rust-mem-assert-type-size"]
sources:
  - title: "rust-skills: const-generics"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/const-generics.md
---
> Parameterize over values with const generics `<const N: usize>`

## Why

Const generics let a single type or function work for any array size — or other constant value — without macros, trait objects, or carrying a runtime length field. The compiler monomorphizes one copy per distinct value, so there is no indirection and no overhead compared to hand-writing the same code for each size. This is the idiomatic way to write generic array-based data structures and algorithms on stable Rust.

## Bad

```rust
// works only for one fixed size — must be copy-pasted per size
fn sum_4(arr: [i32; 4]) -> i32 {
    arr.iter().sum()
}

fn sum_8(arr: [i32; 8]) -> i32 {
    arr.iter().sum()
}

// carries runtime length — extra field, heap allocation, no compile-time bounds
struct Buffer {
    data: Vec<u8>,
    capacity: usize,
}
```

## Good

```rust
// One generic function works for any array size; N is inferred
fn sum<const N: usize>(arr: [i32; N]) -> i32 {
    arr.iter().sum()
}

// Capacity is part of the type — no heap, no runtime length
struct Buffer<const N: usize> {
    data: [u8; N],
}

impl<const N: usize> Buffer<N> {
    fn new() -> Self {
        Self { data: [0; N] }
    }
}

fn main() {
    let total = sum([1, 2, 3, 4]); // N = 4, inferred
    let mut small = Buffer::<8>::new();
    small.data[0] = 42;
    let _ = (total, small);
}
```

## See Also

- [rust-const-fn](const-fn.md) - Mark functions `const fn` so they can be called in const contexts
- [rust-mem-assert-type-size](mem-assert-type-size.md) - Assert type sizes to catch layout regressions
