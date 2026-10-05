---
id: rust-conv-fromstr-parsing
lang: rust
prefix: conv
title: "Implement `FromStr` to enable `str::parse` for string-to-type conversions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["fromstr", "parsing", "implement", "enable", "str", "parse", "string-to-type", "conversions"]
  files: ["**/*.rs"]
  symbols: ["FromStr", "str::parse"]
related: ["rust-conv-tryfrom-fallible", "rust-type-newtype-validated", "rust-api-parse-dont-validate"]
sources:
  - title: "rust-skills: conv-fromstr-parsing"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/conv-fromstr-parsing.md
---
> Implement `FromStr` to enable `str::parse` for string-to-type conversions

## Why

`FromStr` is the single standard hook for parsing a `&str` into a typed value. Implementing it unlocks the idiomatic `.parse::<T>()` call, integrates with CLI argument parsers (clap, argh), and is the expected interface for serde string-deserializable types. A bespoke `fn parse_foo(s: &str)` forces callers to learn a private name and breaks generic code that constrains `T: FromStr`.

## Bad

```rust
#[derive(Debug)]
enum Color { Red, Green, Blue }

// Callers must know this private name; no `.parse()` support
fn parse_color(s: &str) -> Result<Color, String> {
    match s {
        "red"   => Ok(Color::Red),
        "green" => Ok(Color::Green),
        "blue"  => Ok(Color::Blue),
        other   => Err(format!("unknown color: {other}")),
    }
}

fn main() {
    let c = parse_color("red").unwrap();
}
```

## Good

```rust
use std::str::FromStr;

#[derive(Debug, PartialEq)]
enum Color { Red, Green, Blue }

#[derive(Debug)]
struct ParseColorError(String);

impl std::fmt::Display for ParseColorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { write!(f, "unknown color: {}", self.0) }
}

impl FromStr for Color {
    type Err = ParseColorError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "red" => Ok(Color::Red), "green" => Ok(Color::Green), "blue" => Ok(Color::Blue),
            other => Err(ParseColorError(other.to_owned())),
        }
    }
}

fn parse_color() -> Result<Color, ParseColorError> {
    "green".parse()
}
```

## See Also

- [rust-conv-tryfrom-fallible](conv-tryfrom-fallible.md) - `TryFrom` for fallible non-string conversions
- [rust-type-newtype-validated](type-newtype-validated.md) - newtypes for validated data like `Email`, `Url`
- [rust-api-parse-dont-validate](api-parse-dont-validate.md) - Parse into validated types at boundaries
