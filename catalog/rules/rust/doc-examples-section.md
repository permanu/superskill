---
id: rust-doc-examples-section
lang: rust
prefix: doc
title: "Include `# Examples` with runnable code"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["examples", "section", "include", "runnable", "code"]
  files: ["**/*.rs"]
related: ["rust-doc-question-mark", "rust-doc-hidden-setup", "rust-doc-errors-section"]
sources:
  - title: "rust-skills: doc-examples-section"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-examples-section.md
---
> Include `# Examples` with runnable code

## Why

Examples are the most valuable part of documentation. They show users exactly how to use your API. Rust's doc tests ensure examples stay correct as code evolves.

## Bad

```rust
pub struct Foo;
pub struct Error;

/// Parses a string into a Foo.
pub fn parse(s: &str) -> Result<Foo, Error> {
    // No examples - users have to guess usage
    let _ = s;
    Err(Error)
}

/// A widget for doing things.
/// 
/// This widget is very useful.
pub struct Widget {
    // Still no examples
}
```

## Good

```rust
pub struct Foo;
pub struct Error;

/// Parses a string into a Foo.
///
/// # Examples
///
/// ```
/// use my_crate::parse;
///
/// let foo = parse("hello").unwrap();
/// assert_eq!(foo.name(), "hello");
/// ```
///
/// Empty strings are valid:
///
/// ```
/// use my_crate::parse;
///
/// let foo = parse("").unwrap();
/// assert!(foo.is_empty());
/// ```
pub fn parse(s: &str) -> Result<Foo, Error> {
    Err(Error)
}
```

## See Also

- [rust-doc-question-mark](doc-question-mark.md) - Use ? in examples
- [rust-doc-hidden-setup](doc-hidden-setup.md) - Hide setup code with #
- [rust-doc-errors-section](doc-errors-section.md) - Document error conditions
