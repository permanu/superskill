---
id: rust-test-descriptive-names
lang: rust
prefix: test
title: "Use descriptive test names that explain what is being tested"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["descriptive", "names", "test", "explain", "being", "tested"]
  files: ["**/*.rs"]
related: ["rust-test-arrange-act-assert", "rust-test-cfg-test-module", "rust-doc-examples-section"]
sources:
  - title: "rust-skills: test-descriptive-names"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-descriptive-names.md
---
> Use descriptive test names that explain what is being tested

## Why

Test names appear in test output and serve as documentation. A good test name tells you what behavior is being verified without reading the test body. When a test fails, a descriptive name immediately tells you what broke.

## Bad

```rust
#[test]
fn test1() {}

#[test]
fn test_parse() {}  // Parse what? What behavior?

#[test]
fn it_works() {}

#[test]
fn test_function() {}

// Failure output: "test test_parse FAILED" - which behavior failed?
// What failed? No idea.
```

## Good

```rust
#[test]
fn parse_returns_error_for_empty_input() {}

#[test]
fn parse_handles_unicode_characters() {}

#[test]
fn user_creation_requires_valid_email() {}

#[test]
fn expired_token_is_rejected() {}

// Failure output names the exact behavior that broke
// Immediately know what broke!
```

## See Also

- [rust-test-arrange-act-assert](test-arrange-act-assert.md) - Test structure
- [rust-test-cfg-test-module](test-cfg-test-module.md) - Test module organization
- [rust-doc-examples-section](doc-examples-section.md) - Documentation tests
