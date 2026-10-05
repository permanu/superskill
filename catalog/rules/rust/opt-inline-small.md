---
id: rust-opt-inline-small
lang: rust
prefix: opt
title: "Use `#[inline]` for small hot functions"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["inline", "small", "hot", "functions"]
  files: ["**/*.rs"]
  symbols: ["inline"]
related: ["rust-opt-inline-always-rare", "rust-opt-inline-never-cold", "rust-opt-cold-unlikely", "rust-opt-lto-release"]
sources:
  - title: "rust-skills: opt-inline-small"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/opt-inline-small.md
  - title: "github.com/BurntSushi/ripgrep/blob/master/crates/printer/src/standard.rs"
    url: https://github.com/BurntSushi/ripgrep/blob/master/crates/printer/src/standard.rs
---
> Use `#[inline]` for small hot functions

## Why

Function call overhead (stack frame setup, register saves, jumps) can dominate small functions. Inlining eliminates this overhead and enables further optimizations by the compiler. Inlining happens automatically within a crate; the attribute matters for cross-crate calls.

## Bad

```rust
// Small hot function without inline hint
// May not be inlined across crate boundaries
fn is_ascii_digit(b: u8) -> bool {
    b >= b'0' && b <= b'9'
}

fn count_digits(data: &[u8]) -> usize {
    let mut count = 0;
    // Called millions of times
    for byte in data {
        if is_ascii_digit(*byte) {  // Function call overhead
            count += 1;
        }
    }
    count
}
```

## Good

```rust
#[inline]
fn is_ascii_digit(b: u8) -> bool {
    b >= b'0' && b <= b'9'
}

fn count_digits(data: &[u8]) -> usize {
    let mut count = 0;
    // Now the compiler will inline this
    for byte in data {
        if is_ascii_digit(*byte) {  // Inlined, no call overhead
            count += 1;
        }
    }
    count
}
```

## See Also

- [rust-opt-inline-always-rare](opt-inline-always-rare.md) - Use #[inline(always)] sparingly
- [rust-opt-inline-never-cold](opt-inline-never-cold.md) - Use #[inline(never)] for cold paths
- [rust-opt-cold-unlikely](opt-cold-unlikely.md) - Use #[cold] for unlikely paths
- [rust-opt-lto-release](opt-lto-release.md) - LTO enables cross-crate inlining
