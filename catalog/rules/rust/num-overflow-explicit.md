---
id: rust-num-overflow-explicit
lang: rust
prefix: num
title: "Handle integer overflow explicitly: `checked_`/`saturating_`/`wrapping_`/`overflowing_`"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["overflow", "explicit", "handle", "integer", "explicitly", "checked_", "saturating_", "wrapping_"]
  files: ["**/*.rs"]
  symbols: ["checked_", "saturating_", "wrapping_", "overflowing_"]
related: ["rust-num-saturating-clamp", "rust-num-cast-try-from"]
sources:
  - title: "rust-skills: num-overflow-explicit"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/num-overflow-explicit.md
---
> Handle integer overflow explicitly: `checked_`/`saturating_`/`wrapping_`/`overflowing_`

## Why

Integer overflow panics in debug builds and silently wraps (two's complement) in release builds. Relying on either default behavior is a latent bug — the release build can produce wrong results without any diagnostic. Choosing an explicit variant makes intent unmistakable to both the compiler and future readers.

## Bad

```rust
fn add_score(current: u32, delta: u32) -> u32 {
    current + delta  // panics in debug, wraps silently in release
}

fn increment_counter(c: u8) -> u8 {
    c + 1  // wraps to 0 in release when c == 255
}
```

## Good

```rust
// checked_add: returns None on overflow — propagate or handle the error
fn add_score(current: u32, delta: u32) -> Option<u32> {
    current.checked_add(delta)
}

// saturating_add: clamps at the type's upper bound (u8::MAX == 255)
fn increment_saturating(c: u8) -> u8 {
    c.saturating_add(1)
}

// wrapping_add: intentional modular (two's complement) arithmetic
fn wrapping_sequence(n: u8) -> u8 {
    n.wrapping_add(1)
}

// overflowing_add: returns (result, did_overflow) — useful for carry detection
fn add_with_carry(a: u32, b: u32) -> (u32, bool) {
    a.overflowing_add(b)
}
fn main() {
    assert_eq!(add_score(u32::MAX, 1), None);
    assert_eq!(increment_saturating(255), 255);
    assert_eq!(wrapping_sequence(255), 0);
    assert_eq!(add_with_carry(u32::MAX, 1), (0, true));
}
```

## See Also

- [rust-num-saturating-clamp](num-saturating-clamp.md) - Bound values with `clamp` and saturating arithmetic
- [rust-num-cast-try-from](num-cast-try-from.md) - avoid `as` for narrowing casts; prefer `TryFrom`
