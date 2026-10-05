---
id: rust-const-fn
lang: rust
prefix: const
title: "Make functions `const fn` when they can run at compile time"
severity: should
enforce: review
baseline: latest
status: verified
compile_exempt: "intentional compile-error demonstration"
triggers:
  keywords: ["make", "functions", "const", "run", "compile", "time"]
  files: ["**/*.rs"]
related: ["rust-const-block", "rust-const-generics", "rust-opt-inline-small"]
sources:
  - title: "rust-skills: const-fn"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/const-fn.md
---
> Make functions `const fn` when they can run at compile time

## Why

> Note: the Bad snippet intentionally does not compile (`header_len()` is not a `const fn`, so it cannot be used as an array length).

A `const fn` can be called in const contexts — array lengths, `const`/`static` initializers, const-generic arguments — as well as at runtime, so marking a pure, simple function `const` widens where it can be used at zero cost. The compiler evaluates calls in const contexts during compilation, eliminating the work entirely from the binary. Current stable Rust supports most arithmetic, bitwise ops, conditionals, and slice operations in `const fn`; the main restrictions are heap allocation and most trait method calls.

## Bad

```rust
// not const — cannot use result as an array length or const initializer
fn header_len() -> usize {
    4
}

fn magic_mask() -> u32 {
    0xFF00_FF00
}

fn make_buf() -> [u8; 8] {
    // runtime call — compiler cannot inline the length into the type
    [0u8; header_len()]  // error: `header_len` is not a `const fn`
}
```

## Good

```rust
const fn header_len() -> usize {
    4
}
const fn magic_mask() -> u32 {
    0xFF00_FF00
}
// usable in a const initializer
const MASK: u32 = magic_mask();
// usable in a static
static HEADER: [u8; header_len()] = [0u8; header_len()];
// const fn with logic — still fine on stable
const fn align_up(n: usize, align: usize) -> usize {
    (n + align - 1) & !(align - 1)
}
const ALIGNED: usize = align_up(13, 8); // 16, computed at compile time
fn main() {
    // usable as an array length — evaluated at compile time
    let buf = [0u8; header_len()];
    let _ = (buf, MASK, HEADER, ALIGNED);
}
```

## See Also

- [rust-const-block](const-block.md) - Force compile-time evaluation and assertions inline
- [rust-const-generics](const-generics.md) - Parameterize types and functions over const values
- [rust-opt-inline-small](opt-inline-small.md) - Inline small hot functions
