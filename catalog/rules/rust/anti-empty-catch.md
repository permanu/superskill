---
id: rust-anti-empty-catch
lang: rust
prefix: anti
title: "Don't silently ignore errors"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["empty", "catch", "don", "silently", "ignore", "errors"]
  files: ["**/*.rs"]
related: ["rust-err-result-over-panic", "rust-err-context-chain", "rust-anti-unwrap-abuse"]
sources:
  - title: "rust-skills: anti-empty-catch"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/anti-empty-catch.md
---
> Don't silently ignore errors

## Why

Empty error handling (`if let Err(_) = ...`, `let _ = result`, `.ok()`) silently discards errors. Failures go unnoticed, bugs hide, and debugging becomes impossible. Every error deserves acknowledgment—even if just logging.

## Bad

```rust
fn write_to_file(_data: &str) -> Result<(), String> { Ok(()) }
fn send_notification() -> Result<(), String> { Ok(()) }
fn risky_operation() -> Result<i32, String> { Ok(1) }
fn process(_item: i32) -> Result<(), String> { Ok(()) }
fn save(_record: &str) -> Result<(), String> { Ok(()) }
fn main() {
    // Silently ignores errors
    let _ = write_to_file("data");
    // Discards the error completely
    if let Err(_) = send_notification() {
    }
    // Converts Result to Option, losing error info
    let _value = risky_operation().ok();
    // Empty match arm swallows the failure
    match save("record") {
        Ok(_) => println!("saved"),
        Err(_) => {}
    }
    // Failures unnoticed in a loop
    for item in [1, 2, 3] {
        let _ = process(item);
    }
}
```

## Good

```rust
use log::{error, info, warn};
fn write_to_file(_data: &str) -> Result<(), String> { Ok(()) }
fn send_notification() -> Result<(), String> { Ok(()) }
fn cleanup_temp_file() -> Result<(), String> { Ok(()) }

fn run() -> Result<(), Box<dyn std::error::Error>> {
    // Log the error
    if let Err(e) = write_to_file("data") {
        error!("failed to write file: {e}");
    }
    // Propagate when the caller can handle it
    send_notification()?;
    // Or handle it explicitly
    match send_notification() {
        Ok(_) => info!("notification sent"),
        Err(e) => warn!("notification failed: {e}"),
    }
    // Intentionally ignored: cleanup failure is not critical
    let _ = cleanup_temp_file();
    Ok(())
}

fn main() {
    let _ = run();
}
```

## See Also

- [rust-err-result-over-panic](err-result-over-panic.md) - Proper error handling
- [rust-err-context-chain](err-context-chain.md) - Adding context
- [rust-anti-unwrap-abuse](anti-unwrap-abuse.md) - Unwrap issues
