---
id: rust-test-doctest-examples
lang: rust
prefix: test
title: "Keep documentation examples as executable doctests"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["doctest", "examples", "keep", "documentation", "executable", "doctests"]
  files: ["**/*.rs"]
related: ["rust-doc-examples-section", "rust-doc-hidden-setup", "rust-doc-question-mark"]
sources:
  - title: "rust-skills: test-doctest-examples"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-doctest-examples.md
---
> Keep documentation examples as executable doctests

## Why

Doctests are examples in documentation that are automatically tested. They serve dual purposes: demonstrating usage to readers and verifying the examples compile and work. When your API changes, failing doctests catch outdated documentation.

## Bad

```rust
/// Parses a number from a string.
/// 
/// Example:
/// let n = parse("42");  // Not tested!
/// assert_eq!(n, 42);
pub fn parse(s: &str) -> i32 {
    s.parse().unwrap()
}

// Documentation can become outdated:
/// Adds two numbers.
/// 
/// ```
/// let sum = add(1, 2, 3);  // Wrong number of args - not caught!
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

## Good

```rust
/// Parses a number from a string.
///
/// # Examples
///
/// ```
/// use my_crate::parse;
/// let n = parse("42");
/// assert_eq!(n, 42);
/// ```
pub fn parse(s: &str) -> i32 {
    s.parse().unwrap()
}

/// Adds two numbers.
///
/// # Examples
///
/// ```
/// use my_crate::add;
/// let sum = add(1, 2);
/// assert_eq!(sum, 3);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

## See Also

- [rust-doc-examples-section](doc-examples-section.md) - Documentation structure
- [rust-doc-hidden-setup](doc-hidden-setup.md) - Hiding setup code
- [rust-doc-question-mark](doc-question-mark.md) - Error handling in examples
