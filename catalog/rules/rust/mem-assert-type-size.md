---
id: rust-mem-assert-type-size
lang: rust
prefix: mem
title: "Use static assertions to guard against accidental type size growth"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["assert", "type", "size", "static", "assertions", "guard", "against", "accidental"]
  files: ["**/*.rs"]
related: ["rust-mem-smaller-integers", "rust-mem-box-large-variant", "rust-opt-cache-friendly"]
sources:
  - title: "rust-skills: mem-assert-type-size"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-assert-type-size.md
---
> Use static assertions to guard against accidental type size growth

## Why

Adding a field to a frequently-instantiated struct can silently bloat memory usage. Static size assertions catch this at compile time, making size changes intentional rather than accidental. This is especially important for types stored in large collections or passed frequently by value.

## Bad

```rust
enum EventKind {
    Started,
    Stopped,
}

// Before: this struct was 48 bytes
// struct Event {
//     timestamp: u64,
//     kind: EventKind,
//     payload: [u8; 32],
// }

// Later, someone adds a field without realizing the impact
struct Event {
    timestamp: u64,
    kind: EventKind,
    payload: [u8; 32],
    metadata: String,  // Silently adds 24 bytes!
}

// 10 million events now use 240MB more memory
// No warning, no review trigger
```

## Good

```rust
enum EventKind {
    Started,
    Stopped,
}

struct Event {
    timestamp: u64,
    kind: EventKind,
    payload: [u8; 32],
}

// Static assertion - breaks compile if size changes
const _: () = assert!(std::mem::size_of::<Event>() == 48);

// Or with static_assertions crate
use static_assertions::assert_eq_size;
assert_eq_size!(Event, [u8; 48]);

// Now adding metadata triggers compile error:
// error: assertion failed: std::mem::size_of::<Event>() == 48
```

## See Also

- [rust-mem-smaller-integers](mem-smaller-integers.md) - Choosing appropriate integer sizes
- [rust-mem-box-large-variant](mem-box-large-variant.md) - Managing enum variant sizes
- [rust-opt-cache-friendly](opt-cache-friendly.md) - Cache line considerations
