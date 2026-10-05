---
id: rust-type-display-vs-debug
lang: rust
prefix: type
title: "Use `Display` for user-facing output and `Debug` for diagnostics; never swap them"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["display", "debug", "user-facing", "output", "diagnostics", "swap", "them"]
  files: ["**/*.rs"]
  symbols: ["Display", "Debug"]
related: ["rust-api-common-traits", "rust-err-thiserror-lib", "rust-type-numeric-fmt"]
sources:
  - title: "rust-skills: type-display-vs-debug"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/type-display-vs-debug.md
---
> Use `Display` for user-facing output and `Debug` for diagnostics; never swap them

## Why

`Debug` (`{:?}`) is for developers: logs, panic messages, test assertions, and `dbg!()`. It should always be derived and reflects internal structure. `Display` (`{}`) is for end users: CLI output, error messages surfaced to humans, and log fields meant to be read in production. `std::error::Error` requires `Display` so that error chains read naturally. Routing `Debug` output to users leaks implementation details; routing `Display` output to log frameworks loses structural information.

## Bad

```rust
#[derive(Debug)]
struct ParseError {
    input: String,
    line: u32,
}

// Mistake 1: using Debug output in a user-facing message
fn report_error(e: &ParseError) {
    eprintln!("failed: {:?}", e); // leaks internal field names
}

// Mistake 2: implementing Display by calling debug
use std::fmt;
impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self) // wrong — duplicates Debug
    }
}
```

## Good

```rust
use std::fmt;

#[derive(Debug)] // derive Debug for free diagnostic output
struct ParseError {
    input: String,
    line: u32,
}

// Hand-write Display for a clean, human-readable message
impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "parse error on line {}: {:?}", self.line, self.input)
    }
}

impl std::error::Error for ParseError {}

fn main() {
    let e = ParseError { input: "foo bar".into(), line: 42 };
    eprintln!("error: {e}");   // user-facing: clean sentence
    eprintln!("debug: {e:?}"); // developer/log: structured dump
}
```

## See Also

- [rust-api-common-traits](api-common-traits.md) - implement `Debug`, `Clone`, `PartialEq` eagerly
- [rust-err-thiserror-lib](err-thiserror-lib.md) - `thiserror` generates correct `Display` from `#[error("...")]`
- [rust-type-numeric-fmt](type-numeric-fmt.md) - Hex/octal/binary formatting for numeric newtypes
