---
id: rust-own-lifetime-elision
lang: rust
prefix: own
title: "Rely on lifetime elision rules; add explicit lifetimes only when required"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["lifetime", "elision", "rely", "rules", "add", "explicit", "lifetimes", "required"]
  files: ["**/*.rs"]
related: ["rust-own-borrow-over-clone", "rust-api-impl-asref"]
sources:
  - title: "rust-skills: own-lifetime-elision"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/own-lifetime-elision.md
---
> Rely on lifetime elision rules; add explicit lifetimes only when required

## Why

Rust's lifetime elision rules handle most common borrowing patterns automatically. Adding explicit lifetimes where they're not needed clutters code without adding clarity. However, understanding when elision applies helps you know when explicit lifetimes are truly necessary.

## Bad

```rust
use std::fmt::{self, Display, Formatter};

struct Person {
    name: String,
}

struct Wrapper<'a>(&'a str);

// Unnecessary explicit lifetimes - elision handles these
fn first_word<'a>(s: &'a str) -> &'a str {
    s.split_whitespace().next().unwrap_or("")
}

fn get_name<'a>(person: &'a Person) -> &'a str {
    &person.name
}

impl<'a> Display for Wrapper<'a> {
    fn fmt<'b>(&'b self, f: &'b mut Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
```

## Good

```rust
use std::fmt::{self, Display, Formatter};

struct Person {
    name: String,
}

struct Wrapper<'a>(&'a str);

// Let elision do its job
fn first_word(s: &str) -> &str {
    s.split_whitespace().next().unwrap_or("")
}

fn get_name(person: &Person) -> &str {
    &person.name
}

impl Display for Wrapper<'_> {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
```

## See Also

- [rust-own-borrow-over-clone](own-borrow-over-clone.md) - Prefer borrowing to avoid ownership issues
- [rust-api-impl-asref](api-impl-asref.md) - Generic borrowing with AsRef
