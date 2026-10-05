---
id: rust-mem-compact-string
lang: rust
prefix: mem
title: "Use compact string types for memory-constrained string storage"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["compact", "string", "types", "memory-constrained", "storage"]
  files: ["**/*.rs"]
related: ["rust-mem-boxed-slice", "rust-own-cow-conditional", "rust-mem-smallvec"]
sources:
  - title: "rust-skills: mem-compact-string"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-compact-string.md
---
> Use compact string types for memory-constrained string storage

## Why

Standard `String` is 24 bytes (pointer + length + capacity). For applications storing millions of short strings, this overhead dominates. Compact string libraries like `compact_str`, `smartstring`, or `ecow` store small strings inline (no heap allocation) and use optimized layouts for larger strings.

## Bad

```rust
struct User {
    id: u64,
    // Most usernames are ≤ 24 chars, but String is always 24 bytes + heap
    username: String,
    email: String,
}

// 1 million users = 24 bytes * 2 * 1M = 48MB just for String metadata
// Plus all the heap allocations for actual content
```

## Good

```rust
use compact_str::CompactString;

struct User {
    id: u64,
    // CompactString: 24 bytes, but strings ≤ 24 bytes are inline (no heap)
    username: CompactString,
    email: CompactString,
}

// Most usernames fit inline = zero heap allocations
// Same memory footprint as String but way fewer allocations
```

## See Also

- [rust-mem-boxed-slice](mem-boxed-slice.md) - Box<str> for immutable strings
- [rust-own-cow-conditional](own-cow-conditional.md) - Cow<str> for borrow-or-own
- [rust-mem-smallvec](mem-smallvec.md) - Similar concept for Vec
