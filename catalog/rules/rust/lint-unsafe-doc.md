---
id: rust-lint-unsafe-doc
lang: rust
prefix: lint
title: "Require documentation for unsafe blocks"
severity: should
enforce: tool
tool: clippy::undocumented_unsafe_blocks
baseline: latest
status: verified
triggers:
  keywords: ["unsafe", "doc", "require", "documentation", "blocks"]
  files: ["**/*.rs"]
related: ["rust-doc-safety-section", "rust-lint-deny-correctness", "rust-type-repr-transparent"]
sources:
  - title: "rust-skills: lint-unsafe-doc"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/lint-unsafe-doc.md
---
> Require documentation for unsafe blocks

## Why

The `undocumented_unsafe_blocks` lint ensures every unsafe block has a `// SAFETY:` comment explaining why the operation is sound. Unsafe code is the source of most memory safety bugs—documenting invariants catches mistakes and helps reviewers.

## Bad

```rust
pub struct Buffer {
    data: Vec<u8>,
}

pub fn read_data<'a>(ptr: *const u8, len: usize) -> &'a [u8] {
    unsafe {
        std::slice::from_raw_parts(ptr, len)  // WARN: undocumented
    }
}

impl Buffer {
    pub fn get_unchecked(&self, index: usize) -> &u8 {
        unsafe { self.data.get_unchecked(index) }  // WARN
    }
}
```

## Good

```rust
pub struct Buffer {
    data: Vec<u8>,
}

pub fn read_data<'a>(ptr: *const u8, len: usize) -> &'a [u8] {
    // SAFETY: caller guarantees ptr is valid for len bytes,
    // properly aligned, initialized, and not aliased.
    unsafe { std::slice::from_raw_parts(ptr, len) }
}

impl Buffer {
    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn get_unchecked(&self, index: usize) -> &u8 {
        debug_assert!(index < self.len(), "index out of bounds");
        // SAFETY: the debug assertion documents the invariant; callers
        // must keep index within bounds in release builds too.
        unsafe { self.data.get_unchecked(index) }
    }
}
```

## See Also

- [rust-doc-safety-section](doc-safety-section.md) - `# Safety` in docs
- [rust-lint-deny-correctness](lint-deny-correctness.md) - Correctness lints
- [rust-type-repr-transparent](type-repr-transparent.md) - FFI safety
