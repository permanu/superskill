---
id: rust-anti-expect-lazy
lang: rust
prefix: anti
title: "Don't use expect for recoverable errors"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["expect", "lazy", "don", "recoverable", "errors"]
  files: ["**/*.rs"]
related: ["rust-err-expect-bugs-only", "rust-err-no-unwrap-prod", "rust-anti-unwrap-abuse"]
sources:
  - title: "rust-skills: anti-expect-lazy"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-expect-lazy.md
---
> Don't use expect for recoverable errors

## Why

`.expect()` panics with a custom message, but it's still a panic. Using it for errors that could reasonably occur in production (network failures, file not found, invalid input) crashes the program instead of handling the error gracefully.

Reserve `.expect()` for programming errors where panic is appropriate.

## Bad

```rust
use std::fs;

async fn find_user(_id: u64) -> Result<Option<String>, String> {
    Ok(Some(String::new()))
}

#[tokio::main]
async fn main() {
    let client = reqwest::Client::new();

    // Network failures are expected - don't panic
    let response = client.get("https://example.com").send().await.expect("failed to fetch");

    // Files might not exist
    let config = fs::read_to_string("config.toml").expect("config not found");

    // User input can be invalid
    let age: u32 = "42".parse().expect("invalid age");

    // Database queries can fail
    let user = find_user(1).await.expect("user not found");

    let _ = (response, config, age, user);
}
```

## Good

```rust
use anyhow::{anyhow, Context};
use std::fs;

async fn find_user(_id: u64) -> anyhow::Result<Option<String>> {
    Ok(Some(String::new()))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let client = reqwest::Client::new();
    // Network failures are handled, not panicked on
    let response = client.get("https://example.com").send().await
        .context("failed to fetch URL")?;
    // File errors are propagated
    let config = fs::read_to_string("config.toml")
        .context("failed to read config file")?;
    // Invalid input is mapped to an error
    let age: u32 = "42".parse()
        .map_err(|_| anyhow!("age must be a number"))?;
    // Missing data becomes an error
    let user = find_user(1).await?
        .ok_or_else(|| anyhow!("user not found"))?;
    let _ = (response, config, age, user);
    Ok(())
}
```

## See Also

- [rust-err-expect-bugs-only](err-expect-bugs-only.md) - When to use expect
- [rust-err-no-unwrap-prod](err-no-unwrap-prod.md) - Avoiding unwrap
- [rust-anti-unwrap-abuse](anti-unwrap-abuse.md) - Unwrap anti-pattern
