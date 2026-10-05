---
id: rust-test-tokio-async
lang: rust
prefix: test
title: "Use `#[tokio::test]` for async tests"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["tokio", "async", "test", "tests"]
  files: ["**/*.rs"]
  symbols: ["tokio::test"]
related: ["rust-async-tokio-runtime", "rust-test-mock-traits", "rust-test-fixture-raii"]
sources:
  - title: "rust-skills: test-tokio-async"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-tokio-async.md
---
> Use `#[tokio::test]` for async tests

## Why

Async functions can't be called directly—they need a runtime to drive them. `#[tokio::test]` provides a Tokio runtime for your test, handling setup automatically. This is simpler than manually creating a runtime and essential for testing async code.

## Bad

```rust
async fn fetch_data() -> Result<String, std::io::Error> {
    Ok(String::new())
}

// Won't compile - async fn can't be called without runtime
// #[test]
// async fn test_async_function() {  // Error!
//     let result = fetch_data().await;
//     assert!(result.is_ok());
// }

// Manual runtime - verbose and error-prone
#[test]
fn test_async_function() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let result = fetch_data().await;
        assert!(result.is_ok());
    });
}
```

## Good

```rust
async fn fetch_data() -> Result<String, std::io::Error> {
    Ok(String::new())
}
async fn fetch_user(_id: u64) -> Result<String, std::io::Error> {
    Ok(String::new())
}

#[tokio::test]
async fn test_async_function() {
    let result = fetch_data().await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_concurrent_operations() {
    let (a, b) = tokio::join!(
        fetch_user(1),
        fetch_user(2),
    );
    assert!(a.is_ok());
    assert!(b.is_ok());
}
```

## See Also

- [rust-async-tokio-runtime](async-tokio-runtime.md) - Runtime configuration
- [rust-test-mock-traits](test-mock-traits.md) - Mocking async traits
- [rust-test-fixture-raii](test-fixture-raii.md) - Async test cleanup
