---
id: rust-mem-boxed-slice
lang: rust
prefix: mem
title: "Use `Box<[T]>` instead of `Vec<T>` for fixed-size heap data"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["boxed", "slice", "box", "vec", "fixed-size", "heap", "data"]
  files: ["**/*.rs"]
  symbols: ["Box", "Vec"]
related: ["rust-mem-with-capacity", "rust-own-slice-over-vec", "rust-mem-compact-string"]
sources:
  - title: "rust-skills: mem-boxed-slice"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-boxed-slice.md
---
> Use `Box<[T]>` instead of `Vec<T>` for fixed-size heap data

## Why

`Vec<T>` stores three words: pointer, length, and capacity. When you know a collection won't grow, `Box<[T]>` stores only pointer and length (2 words), saving 8 bytes per instance. More importantly, it communicates intent: "this data is fixed-size." For large numbers of fixed collections, this adds up.

## Bad

```rust
struct Paragraph;

fn parse_paragraphs(_data: &[u8]) -> Vec<Paragraph> {
    Vec::new()
}

struct Document {
    // Vec signals "might grow" but we never push after creation
    paragraphs: Vec<Paragraph>,  // 24 bytes: ptr + len + capacity
}

fn load_document(data: &[u8]) -> Document {
    let paragraphs: Vec<Paragraph> = parse_paragraphs(data);
    // paragraphs has capacity >= len, wasting the capacity field
    Document { paragraphs }
}
```

## Good

```rust
struct Paragraph;

fn parse_paragraphs(_data: &[u8]) -> Vec<Paragraph> {
    Vec::new()
}

struct Document {
    // Box<[T]> signals "fixed size" - clear intent
    paragraphs: Box<[Paragraph]>,  // 16 bytes: ptr + len (as fat pointer)
}

fn load_document(data: &[u8]) -> Document {
    let paragraphs: Vec<Paragraph> = parse_paragraphs(data);
    Document { 
        paragraphs: paragraphs.into_boxed_slice()  // Shrinks + converts
    }
}
```

## See Also

- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocating when size is known
- [rust-own-slice-over-vec](own-slice-over-vec.md) - Using slices in function parameters
- [rust-mem-compact-string](mem-compact-string.md) - Compact string alternatives
