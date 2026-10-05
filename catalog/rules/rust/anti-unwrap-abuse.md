---
id: rust-anti-unwrap-abuse
lang: rust
prefix: anti
title: "Don't use `.unwrap()` in production code"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["unwrap", "abuse", "don", "production", "code"]
  files: ["**/*.rs"]
related: ["rust-err-question-mark", "rust-err-result-over-panic", "rust-anti-expect-lazy"]
sources:
  - title: "rust-skills: anti-unwrap-abuse"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-unwrap-abuse.md
---
> Don't use `.unwrap()` in production code

## Why

`.unwrap()` panics on `None` or `Err`, crashing your program. In production, this means lost data, failed requests, and unhappy users. It also makes debugging harder: a bare panic reports nothing about what failed.

## Bad

```rust
use std::collections::HashMap;
use std::sync::mpsc;

fn main() {
    // Crashes if file doesn't exist
    let content = std::fs::read_to_string("config.toml").unwrap();

    // Crashes on invalid input
    let user_input = "42";
    let num: i32 = user_input.parse().unwrap();

    // Crashes if key missing
    let map: HashMap<String, i32> = HashMap::new();
    let value = map.get("key").unwrap();

    // Crashes if channel closed
    let (_tx, receiver) = mpsc::channel::<i32>();
    let msg = receiver.recv().unwrap();

    let _ = (content, num, value, msg);
}
```

## Good

```rust
use std::collections::HashMap;
use std::sync::mpsc;

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error("read config failed: {0}")]
    Read(#[from] std::io::Error),
    #[error("missing key")]
    MissingKey,
}

fn main() -> Result<(), Error> {
    let _num: i32 = "42".parse().unwrap_or(0);

    let map: HashMap<String, i32> = HashMap::new();
    let _value = map.get("key").ok_or(Error::MissingKey)?;
    let (_tx, receiver) = mpsc::channel::<i32>();
    loop {
        match receiver.recv() {
            Ok(msg) => println!("{msg}"),
            Err(_) => break,
        }
    }
    Ok(())
}
```

## See Also

- [rust-err-question-mark](err-question-mark.md) - Use ? for propagation
- [rust-err-result-over-panic](err-result-over-panic.md) - Return Result instead of panicking
- [rust-anti-expect-lazy](anti-expect-lazy.md) - Don't use expect for recoverable errors
