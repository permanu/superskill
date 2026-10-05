---
id: rust-mem-zero-copy
lang: rust
prefix: mem
title: "Use zero-copy patterns with slices and `Bytes`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["zero", "copy", "zero-copy", "patterns", "slices", "bytes"]
  files: ["**/*.rs"]
  symbols: ["Bytes"]
related: ["rust-own-cow-conditional", "rust-own-borrow-over-clone", "rust-mem-arena-allocator"]
sources:
  - title: "rust-skills: mem-zero-copy"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-zero-copy.md
---
> Use zero-copy patterns with slices and `Bytes`

## Why

Zero-copy means working with data without copying it. Instead of allocating new memory and copying bytes, you work with references to the original data. This dramatically reduces memory usage and improves performance, especially for large data.

## Bad

```rust
// Copies every line into a new String
fn get_lines(data: &str) -> Vec<String> {
    data.lines()
        .map(|line| line.to_string())  // Allocates!
        .collect()
}

// Copies the entire buffer
fn process_packet(buffer: &[u8]) -> Vec<u8> {
    let header = buffer[0..16].to_vec();  // Copy!
    let body = buffer[16..].to_vec();      // Copy!
    [header, body].concat()  // Another copy!
}
```

## Good

```rust
// Zero-copy: returns references to original data
fn get_lines(data: &str) -> Vec<&str> {
    data.lines().collect()  // Just pointers!
}

// Zero-copy with slices
fn process_packet(buffer: &[u8]) -> (&[u8], &[u8]) {
    let header = &buffer[0..16];  // Just a pointer + length
    let body = &buffer[16..];     // Just a pointer + length
    (header, body)
}
```

## See Also

- [rust-own-cow-conditional](own-cow-conditional.md) - Use Cow for conditional ownership
- [rust-own-borrow-over-clone](own-borrow-over-clone.md) - Prefer borrowing over cloning
- [rust-mem-arena-allocator](mem-arena-allocator.md) - Arena allocators for batch operations
