---
id: rust-err-context-chain
lang: rust
prefix: err
title: "Add context with `.context()` or `.with_context()`"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["context", "chain", "add", "with_context"]
  files: ["**/*.rs"]
related: ["rust-err-anyhow-app", "rust-err-source-chain", "rust-err-question-mark"]
sources:
  - title: "rust-skills: err-context-chain"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/err-context-chain.md
---
> Add context with `.context()` or `.with_context()`

## Why

Raw errors lack information about what operation failed. Adding context creates an error chain that tells the full story: what you were trying to do, and why it failed.

## Bad

```rust
type Error = Box<dyn std::error::Error>;

#[derive(serde::Deserialize)]
struct User;

// Raw error - no context
fn load_user(id: u64) -> Result<User, Error> {
    let path = format!("users/{}.json", id);
    let content = std::fs::read_to_string(&path)?;
    Ok(serde_json::from_str(&content)?)
}

// Error message: "No such file or directory (os error 2)"
// Which file? What were we doing?
```

## Good

```rust
use anyhow::{Context, Result};

#[derive(serde::Deserialize)]
struct User;

fn load_user(id: u64) -> Result<User> {
    let path = format!("users/{}.json", id);
    
    let content = std::fs::read_to_string(&path)
        .with_context(|| format!("failed to read user file: {}", path))?;
    
    let user: User = serde_json::from_str(&content)
        .with_context(|| format!("failed to parse user {} JSON", id))?;
    
    Ok(user)
}

// Error: "failed to parse user 42 JSON"
// Caused by: "expected ':' at line 5 column 12"
```

## See Also

- [rust-err-anyhow-app](err-anyhow-app.md) - Use anyhow for applications
- [rust-err-source-chain](err-source-chain.md) - Use #[source] to chain errors
- [rust-err-question-mark](err-question-mark.md) - Use ? for propagation
