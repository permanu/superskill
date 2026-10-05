---
id: rust-test-fixture-raii
lang: rust
prefix: test
title: "Use RAII pattern (Drop trait) for automatic test cleanup"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["fixture", "raii", "pattern", "drop", "trait", "automatic", "test", "cleanup"]
  files: ["**/*.rs"]
related: ["rust-test-arrange-act-assert", "rust-test-tokio-async", "rust-test-mock-traits"]
sources:
  - title: "rust-skills: test-fixture-raii"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-fixture-raii.md
---
> Use RAII pattern (Drop trait) for automatic test cleanup

## Why

Tests need setup and teardown—creating temp files, starting servers, setting environment variables. Using RAII (Resource Acquisition Is Initialization) with Drop ensures cleanup happens automatically, even if the test panics. This prevents test pollution and resource leaks.

## Bad

```rust
#[test]
fn test_with_temp_file() {
    let path = "/tmp/test_file.txt";
    std::fs::write(path, "test data").unwrap();

    let result = std::fs::read_to_string(path);
    std::fs::remove_file(path).unwrap(); // Skipped if the test panics!
    assert!(result.is_ok());
}

#[test]
fn test_with_env_var() {
    // SAFETY: single-threaded test process
    unsafe { std::env::set_var("MY_VAR", "test_value") };

    let value = std::env::var("MY_VAR");
    // SAFETY: single-threaded test process
    unsafe { std::env::remove_var("MY_VAR") }; // Skipped if the test panics!
    assert!(value.is_ok());
}
```

## Good

```rust
use tempfile::NamedTempFile;

fn test_with_temp_file() {
    // File is deleted automatically when `file` drops
    let file = NamedTempFile::new().unwrap();
    std::fs::write(file.path(), "test data").unwrap();
    assert!(std::fs::read_to_string(file.path()).is_ok());
}

// Same idea for env vars: restore on drop, panic or not
struct EnvGuard(String);
impl Drop for EnvGuard {
    fn drop(&mut self) {
        // SAFETY: single-threaded test process
        unsafe { std::env::remove_var(&self.0) };
    }
}
```

## See Also

- [rust-test-arrange-act-assert](test-arrange-act-assert.md) - Test structure
- [rust-test-tokio-async](test-tokio-async.md) - Async test cleanup
- [rust-test-mock-traits](test-mock-traits.md) - Mocking with RAII
