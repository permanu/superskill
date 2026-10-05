---
id: rust-err-thiserror-lib
lang: rust
prefix: err
title: "Use `thiserror` for library error types"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["thiserror", "lib", "library", "error", "types"]
  files: ["**/*.rs"]
  symbols: ["thiserror"]
related: ["rust-err-anyhow-app", "rust-err-from-impl", "rust-err-source-chain"]
sources:
  - title: "rust-skills: err-thiserror-lib"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-thiserror-lib.md
---
> Use `thiserror` for library error types

## Why

Libraries should expose typed, matchable errors so users can handle specific error conditions. `thiserror` generates `Error` trait implementations with minimal boilerplate, creating ergonomic error types that are easy to match against.

## Bad

```rust
struct Data;

// String errors: callers can only match on the message text
fn parse(input: &str) -> Result<Data, String> {
    Err(format!("parse error in {input}"))
}

// Box<dyn Error>: callers cannot match specific conditions
fn load(path: &str) -> Result<Data, Box<dyn std::error::Error>> {
    Err(std::io::Error::new(std::io::ErrorKind::NotFound, path.to_string()).into())
}
```

## Good

```rust
use thiserror::Error;
struct Ast;
#[derive(Error, Debug)]
pub enum ParseError {
    #[error("invalid syntax at line {line}: {message}")]
    Syntax { line: usize, message: String },
    #[error("unexpected end of file")]
    UnexpectedEof,
    #[error("io error reading input")]
    Io(#[from] std::io::Error),
}
fn parse(input: &str) -> Result<Ast, ParseError> {
    if input.is_empty() {
        return Err(ParseError::UnexpectedEof);
    }
    Ok(Ast)
}
fn main() {
    // Callers can match on specific conditions
    if let Err(ParseError::UnexpectedEof) = parse("") {
        eprintln!("file ended unexpectedly");
    }
}
```

## See Also

- [rust-err-anyhow-app](err-anyhow-app.md) - Use anyhow for applications
- [rust-err-from-impl](err-from-impl.md) - Use #[from] for automatic conversion
- [rust-err-source-chain](err-source-chain.md) - Use #[source] to chain errors
