---
id: rust-doc-intra-links
lang: rust
prefix: doc
title: "Use intra-doc links to reference types and items"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["intra", "links", "intra-doc", "reference", "types", "items"]
  files: ["**/*.rs"]
related: ["rust-doc-all-public", "rust-doc-examples-section", "rust-doc-errors-section"]
sources:
  - title: "rust-skills: doc-intra-links"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/doc-intra-links.md
  - title: "serde.rs"
    url: https://serde.rs
---
> Use intra-doc links to reference types and items

## Why

Intra-doc links (`[TypeName]`, `[method](Self::method)`) create clickable references in generated documentation. They're verified at doc-build time, catching broken links early. Unlike URL links, they automatically update when items are renamed or moved.

## Bad

```rust
use std::str::FromStr;

pub struct Buffer {
    data: Vec<u8>,
}
pub struct Error;

impl Buffer {
    /// Returns the length of the buffer.
    ///
    /// See also `capacity()` for the allocated size, and the
    /// `Buffer` struct for more details.
    pub fn len(&self) -> usize {
        self.data.len()
    }
}

/// Parses the input using std::str::FromStr trait.
/// Check the Error enum for possible failures.
pub fn parse<T: FromStr>(input: &str) -> Result<T, Error> {
    let _ = input;
    Err(Error)
}
```

## Good

```rust
use std::str::FromStr;

pub struct Buffer {
    data: Vec<u8>,
}
pub struct Error;

impl Buffer {
    /// Returns the length of the buffer. See also
    /// [`capacity()`](Self::capacity) or the [`Buffer`] type docs.
    pub fn len(&self) -> usize {
        self.data.len()
    }
    /// Returns the allocated capacity of the buffer.
    pub fn capacity(&self) -> usize {
        self.data.capacity()
    }
}

/// Parses the input using [`FromStr`].
/// Check [`Error`] for possible failures.
pub fn parse<T: FromStr>(input: &str) -> Result<T, Error> {
    let _ = input;
    Err(Error)
}
```

## See Also

- [rust-doc-all-public](doc-all-public.md) - Documenting public items
- [rust-doc-examples-section](doc-examples-section.md) - Adding examples
- [rust-doc-errors-section](doc-errors-section.md) - Documenting errors
