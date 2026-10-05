---
id: rust-name-lifetime-short
lang: rust
prefix: name
title: "Use short, conventional lifetime names: `'a`, `'b`, `'de`, `'src`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["lifetime", "short", "conventional", "names", "src"]
  files: ["**/*.rs"]
related: ["rust-own-lifetime-elision", "rust-name-type-param-single", "rust-own-borrow-over-clone"]
sources:
  - title: "rust-skills: name-lifetime-short"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/name-lifetime-short.md
---
> Use short, conventional lifetime names: `'a`, `'b`, `'de`, `'src`

## Why

Lifetime parameters are ubiquitous in Rust signatures. Short names like `'a` keep signatures readable. For domain-specific lifetimes, descriptive but short names like `'src` or `'de` communicate intent without clutter. The Rust community has established conventions that aid recognition.

## Bad

```rust
struct Error;

// Overly verbose lifetimes
fn parse<'input_lifetime, 'output_lifetime>(
    input: &'input_lifetime str
) -> Result<&'output_lifetime str, Error> {
    let _ = input;
    Ok("")
}

// Meaningless long names
struct Parser<'parser_instance_lifetime> {
    source: &'parser_instance_lifetime str,
}
```

## Good

```rust
struct Error;
struct Value<'de>(&'de str);

// Standard short lifetimes
fn parse<'a>(input: &'a str) -> Result<&'a str, Error> {
    Ok(input)
}

struct Parser<'a> {
    source: &'a str,
}

// Multiple lifetimes: 'a, 'b, 'c
fn merge<'a, 'b>(first: &'a str, second: &'b str) -> String {
    format!("{first}{second}")
}

// Descriptive when clarity helps
fn deserialize<'de>(input: &'de [u8]) -> Result<Value<'de>, Error> {
    let text = std::str::from_utf8(input).map_err(|_| Error)?;
    Ok(Value(text))
}
```

## See Also

- [rust-own-lifetime-elision](own-lifetime-elision.md) - When to omit lifetimes
- [rust-name-type-param-single](name-type-param-single.md) - Type parameter naming
- [rust-own-borrow-over-clone](own-borrow-over-clone.md) - Borrowing patterns
