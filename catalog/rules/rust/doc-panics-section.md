---
id: rust-doc-panics-section
lang: rust
prefix: doc
title: "Include `# Panics` section for functions that can panic"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["panics", "section", "include", "functions", "panic"]
  files: ["**/*.rs"]
related: ["rust-doc-errors-section", "rust-doc-safety-section", "rust-err-result-over-panic"]
sources:
  - title: "rust-skills: doc-panics-section"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-panics-section.md
---
> Include `# Panics` section for functions that can panic

## Why

Panics are exceptional conditions that crash the program (or unwind the stack). Users need to know when a function can panic so they can ensure preconditions are met or avoid the function in contexts where panics are unacceptable (e.g., `no_std`, embedded, FFI).

If a function can panic, document exactly when.

## Bad

```rust
pub struct Buffer<T> {
    data: Vec<T>,
}

impl<T> Buffer<T> {
    /// Returns the element at the given index.
    pub fn get(&self, index: usize) -> &T {
        &self.data[index]  // Panics if out of bounds - not documented!
    }
}

/// Divides two numbers.
pub fn divide(a: i32, b: i32) -> i32 {
    a / b  // Panics on division by zero - not documented!
}
```

## Good

```rust
pub struct Buffer<T> {
    data: Vec<T>,
}

impl<T> Buffer<T> {
    /// Returns the element at the given index.
    ///
    /// # Panics
    ///
    /// Panics if `index` is out of bounds (`index >= self.data.len()`).
    pub fn get(&self, index: usize) -> &T {
        &self.data[index]
    }
}

/// Divides two numbers.
///
/// # Panics
///
/// Panics if `divisor` is zero.
pub fn divide(dividend: i32, divisor: i32) -> i32 {
    dividend / divisor
}
```

## See Also

- [rust-doc-errors-section](doc-errors-section.md) - Documenting errors
- [rust-doc-safety-section](doc-safety-section.md) - Documenting unsafe
- [rust-err-result-over-panic](err-result-over-panic.md) - Preferring Result
