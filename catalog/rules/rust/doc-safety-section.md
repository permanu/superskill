---
id: rust-doc-safety-section
lang: rust
prefix: doc
title: "Include `# Safety` section for unsafe functions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["safety", "section", "include", "unsafe", "functions"]
  files: ["**/*.rs"]
related: ["rust-doc-panics-section", "rust-lint-unsafe-doc", "rust-doc-errors-section"]
sources:
  - title: "rust-skills: doc-safety-section"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-safety-section.md
---
> Include `# Safety` section for unsafe functions

## Why

Unsafe functions require callers to uphold invariants that the compiler cannot verify. The `# Safety` section documents exactly what the caller must guarantee for the function to be sound. Without this, users cannot safely call the function.

This is not optional—it's a requirement for sound unsafe code.

## Bad

```rust
/// Reads a value from a raw pointer.
pub unsafe fn read_ptr<T>(ptr: *const T) -> T {
    // What guarantees must the caller provide? Unknown!
    ptr.read()
}

/// Creates a string from raw parts.
pub unsafe fn string_from_raw(ptr: *mut u8, len: usize, cap: usize) -> String {
    String::from_raw_parts(ptr, len, cap)
}
```

## Good

```rust
/// Reads a value from a raw pointer.
///
/// # Safety
///
/// The caller must ensure that:
/// - `ptr` is valid for reads of `size_of::<T>()` bytes
/// - `ptr` is properly aligned for type `T`
/// - `ptr` points to a properly initialized value of type `T`
/// - The memory referenced by `ptr` is not mutated during this call
pub unsafe fn read_ptr<T>(ptr: *const T) -> T {
    ptr.read()
}

/// Creates a `String` from raw parts.
///
/// # Safety
///
/// The caller must guarantee that:
/// - `ptr` was allocated by the same allocator that `String` uses
/// - `len` is less than or equal to `cap`
/// - The first `len` bytes at `ptr` are valid UTF-8
/// - `ptr` is not used again after this call (ownership is transferred)
pub unsafe fn string_from_raw(ptr: *mut u8, len: usize, cap: usize) -> String {
    String::from_raw_parts(ptr, len, cap)
}
```

## See Also

- [rust-doc-panics-section](doc-panics-section.md) - Documenting panics
- [rust-lint-unsafe-doc](lint-unsafe-doc.md) - Enforcing unsafe documentation
- [rust-doc-errors-section](doc-errors-section.md) - Documenting errors
