---
id: rust-mem-thinvec
lang: rust
prefix: mem
title: "Use `ThinVec<T>` for nullable collections with minimal overhead"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["thinvec", "nullable", "collections", "minimal", "overhead"]
  files: ["**/*.rs"]
  symbols: ["ThinVec"]
related: ["rust-mem-smallvec", "rust-mem-boxed-slice", "rust-mem-with-capacity"]
sources:
  - title: "rust-skills: mem-thinvec"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/mem-thinvec.md
---
> Use `ThinVec<T>` for nullable collections with minimal overhead

## Why

Standard `Vec<T>` is 24 bytes even when empty. `ThinVec` from Mozilla's `thin_vec` crate uses a single pointer (8 bytes), storing length and capacity inline with the heap allocation. For Option<Vec<T>> patterns or structs with many optional vecs, this significantly reduces memory overhead.

## Bad

```rust
struct Metadata;

struct TreeNode {
    value: i32,
    // Each node pays 24 bytes for children, even leaves
    children: Vec<TreeNode>,  // Most nodes are leaves with empty Vec
}

// Or using Option<Vec<T>>
struct SparseData {
    // Option<Vec> = 24 bytes (Vec is never null-pointer optimized)
    tags: Option<Vec<String>>,
    metadata: Option<Vec<Metadata>>,
    // 48 bytes for usually-None fields
}
```

## Good

```rust
use thin_vec::ThinVec;

struct Metadata;

struct TreeNode {
    value: i32,
    // Empty ThinVec is just a null pointer - 8 bytes
    children: ThinVec<TreeNode>,
}

struct SparseData {
    // ThinVec empty = 8 bytes each
    tags: ThinVec<String>,
    metadata: ThinVec<Metadata>,
    // 16 bytes vs 48 bytes
}
```

## See Also

- [rust-mem-smallvec](mem-smallvec.md) - Stack-allocated small vecs
- [rust-mem-boxed-slice](mem-boxed-slice.md) - Fixed-size heap slices
- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-allocation strategies
