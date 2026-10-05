---
id: rust-test-should-panic
lang: rust
prefix: test
title: "Use `#[should_panic]` to test that code panics as expected"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["panic", "should_panic", "test", "code", "panics", "expected"]
  files: ["**/*.rs"]
  symbols: ["should_panic"]
related: ["rust-err-result-over-panic", "rust-err-expect-bugs-only", "rust-test-descriptive-names"]
sources:
  - title: "rust-skills: test-should-panic"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-should-panic.md
---
> Use `#[should_panic]` to test that code panics as expected

## Why

Some code should panic on invalid inputs or invariant violations. `#[should_panic]` verifies the panic occurs, optionally checking the panic message. This ensures defensive panics work correctly and documents expected panic conditions.

## Bad

```rust
fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("division by zero");
    }
    a / b
}

#[test]
fn test_panic() {
    // Just calling panicking code makes test fail
    divide(1, 0);  // Test fails with panic
}

// Using catch_unwind is verbose
#[test]
fn test_panic_manual() {
    let result = std::panic::catch_unwind(|| divide(1, 0));
    assert!(result.is_err());
}
```

## Good

```rust
fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("division by zero");
    }
    a / b
}

#[test]
#[should_panic]
fn divide_by_zero_panics() {
    divide(1, 0);
}

#[test]
#[should_panic(expected = "division by zero")]
fn divide_by_zero_panics_with_message() {
    divide(1, 0);
}

#[test]
#[should_panic(expected = "index out of bounds")]
fn index_panic_contains_message() {
    let v = vec![1, 2, 3];
    let _ = v[100];
}
```

## See Also

- [rust-err-result-over-panic](err-result-over-panic.md) - Panic vs Result
- [rust-err-expect-bugs-only](err-expect-bugs-only.md) - When to use expect
- [rust-test-descriptive-names](test-descriptive-names.md) - Test naming
