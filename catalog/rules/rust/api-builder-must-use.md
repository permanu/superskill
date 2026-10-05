---
id: rust-api-builder-must-use
lang: rust
prefix: api
title: "Mark builder methods with `#[must_use]` to prevent silent drops"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["builder", "must", "mark", "methods", "must_use", "prevent", "silent", "drops"]
  files: ["**/*.rs"]
  symbols: ["must_use"]
related: ["rust-api-builder-pattern", "rust-api-must-use", "rust-err-result-over-panic"]
sources:
  - title: "rust-skills: api-builder-must-use"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/api-builder-must-use.md
---
> Mark builder methods with `#[must_use]` to prevent silent drops

## Why

Builder pattern methods return a modified builder. Without `#[must_use]`, calling a builder method and ignoring the return value silently does nothing—the builder is dropped, and the configuration is lost. This creates confusing bugs where code appears correct but has no effect.

## Bad

```rust
use std::time::Duration;

struct Builder {
    timeout: Option<Duration>,
}

impl Builder {
    fn new() -> Self {
        Builder { timeout: None }
    }
    fn timeout(mut self, d: Duration) -> Self {
        self.timeout = Some(d);
        self
    }
    fn build(self) -> Option<Duration> { self.timeout }
}

fn main() {
    // Without #[must_use] this configured builder is silently dropped
    Builder::new().timeout(Duration::from_secs(30));
    let built = Builder::new().build();
    let _ = built;
}
```

## Good

```rust
use std::time::Duration;

struct Builder {
    timeout: Option<Duration>,
}

impl Builder {
    fn new() -> Self {
        Builder { timeout: None }
    }
    #[must_use = "builder methods return a modified builder - chain or assign"]
    fn timeout(mut self, d: Duration) -> Self {
        self.timeout = Some(d);
        self
    }
    fn build(self) -> Option<Duration> { self.timeout }
}

fn main() {
    // Now warns: unused must-use value
    Builder::new().timeout(Duration::from_secs(30));
    // Correct: chain the calls
    let built = Builder::new().timeout(Duration::from_secs(30)).build();
    let _ = built;
}
```

## See Also

- [rust-api-builder-pattern](api-builder-pattern.md) - Builder pattern best practices
- [rust-api-must-use](api-must-use.md) - General must_use guidelines
- [rust-err-result-over-panic](err-result-over-panic.md) - Result types are must_use
