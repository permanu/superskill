---
id: rust-test-arrange-act-assert
lang: rust
prefix: test
title: "Structure tests with clear Arrange, Act, Assert sections"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["arrange", "act", "assert", "structure", "tests", "clear", "sections"]
  files: ["**/*.rs"]
related: ["rust-test-descriptive-names", "rust-test-fixture-raii", "rust-test-mock-traits"]
sources:
  - title: "rust-skills: test-arrange-act-assert"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-arrange-act-assert.md
---
> Structure tests with clear Arrange, Act, Assert sections

## Why

The AAA pattern makes tests readable and maintainable. Each section has a clear purpose: set up test data, execute the code under test, verify the results. This structure helps identify what's being tested and makes tests easier to debug when they fail.

## Bad

```rust
struct User { name: String, email: String }

fn make_user(name: &str, email: &str) -> Result<User, &'static str> {
    if name.is_empty() { return Err("empty name"); }
    Ok(User { name: name.to_string(), email: email.to_string() })
}

// Multiple concerns in one test - hard to understand and debug
#[test]
fn test_user() {
    assert_eq!(make_user("alice", "alice@example.com").unwrap().name, "alice");
    assert!(make_user("", "email@example.com").is_err());
    let u = make_user("bob", "bob@example.com").unwrap();
    assert_eq!(u.email, "bob@example.com");
}
```

## Good

```rust
struct User { name: String, email: String }

fn make_user(name: &str, email: &str) -> Result<User, &'static str> {
    if name.is_empty() { return Err("empty name"); }
    Ok(User { name: name.to_string(), email: email.to_string() })
}
#[test]
fn new_user_has_correct_name() {
    // Arrange
    let (name, email) = ("alice", "alice@example.com");
    // Act
    let user = make_user(name, email).unwrap();
    // Assert
    assert_eq!(user.name, "alice");
}

#[test]
fn user_creation_fails_with_empty_name() {
    // Arrange
    let (name, email) = ("", "email@example.com");
    // Act
    let result = make_user(name, email);
    // Assert
    assert!(result.is_err());
}
```

## See Also

- [rust-test-descriptive-names](test-descriptive-names.md) - Test naming
- [rust-test-fixture-raii](test-fixture-raii.md) - Test setup/teardown
- [rust-test-mock-traits](test-mock-traits.md) - Mocking dependencies
