---
id: rust-const-block
lang: rust
prefix: const
title: "Use inline `const { }` blocks for compile-time evaluation and assertions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["block", "inline", "const", "blocks", "compile-time", "evaluation", "assertions"]
  files: ["**/*.rs"]
related: ["rust-const-fn", "rust-mem-assert-type-size"]
sources:
  - title: "rust-skills: const-block"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/const-block.md
---
> Use inline `const { }` blocks for compile-time evaluation and assertions

## Why

A `const { }` block forces the enclosed expression to be evaluated at compile time, even inside a regular function. This has three practical uses: compile-time assertions that fail the build rather than panicking at runtime; precomputed values inlined at the exact call site without a named `const` item; and initializing arrays of non-`Copy` types that require a per-element constant expression. Catching invariant violations at compile time gives a clearer error message and zero runtime cost.

## Bad

```rust
const SIZE: usize = 64;

fn process(buf: &[u8]) {
    // runtime panic — error surface is deferred until execution
    assert!(SIZE.is_power_of_two(), "SIZE must be a power of two");
    assert!(buf.len() <= SIZE);
}

// repeated magic number — easy to get out of sync
fn header() -> [u8; 4] {
    [0u8; 4]
}

// initializing array of non-Copy type requires unsafe or a workaround without const blocks
// std::array::from_fn is fine, but const blocks make the intent clearer for const values
```

## Good

```rust
const SIZE: usize = 64;

fn process(buf: &[u8]) {
    // compile-time assertion - build fails if SIZE changes to a bad value
    const { assert!(SIZE.is_power_of_two(), "SIZE must be a power of two") };
    assert!(buf.len() <= SIZE);
}

fn magic_header() -> u32 {
    const { 0xDEAD_BEEFu32.swap_bytes() }
}

struct Packet<const HDR: usize, const BODY: usize>;

impl<const HDR: usize, const BODY: usize> Packet<HDR, BODY> {
    fn new() -> Self {
        // fails at compile time if the relationship is violated
        const { assert!(HDR + BODY <= 1500, "packet exceeds ethernet MTU") };
        Packet
    }
}

fn make_table() -> [u64; 4] {
    [const { u64::MAX / 1 }, const { u64::MAX / 2 }, const { u64::MAX / 3 }, const { u64::MAX / 4 }]
}
```

## See Also

- [rust-const-fn](const-fn.md) - Write functions callable in const contexts
- [rust-mem-assert-type-size](mem-assert-type-size.md) - Assert hot type sizes to prevent layout regressions
