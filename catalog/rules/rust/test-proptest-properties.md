---
id: rust-test-proptest-properties
lang: rust
prefix: test
title: "Use proptest for property-based testing"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["proptest", "properties", "property-based", "testing"]
  files: ["**/*.rs"]
related: ["rust-test-criterion-bench", "rust-test-mockall-mocking", "rust-test-arrange-act-assert"]
sources:
  - title: "rust-skills: test-proptest-properties"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/test-proptest-properties.md
---
> Use proptest for property-based testing

## Why

Property-based testing generates random inputs to verify that properties hold across all possible values, not just hand-picked examples. Proptest finds edge cases you wouldn't think to test manually—empty strings, integer overflows, unicode edge cases.

## Bad

```rust
// Hand-picked examples only: edge cases like empty or
// multi-byte input are never exercised.
fn reverse(input: &str) -> String {
    input.chars().rev().collect()
}

#[test]
fn test_reverse() {
    assert_eq!(reverse("abc"), "cba");
    assert_eq!(reverse("a"), "a");
}
```

## Good

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_reverse_reverse_is_identity(s in ".*") {
        let reversed: String = s.chars().rev().collect();
        let double_reversed: String = reversed.chars().rev().collect();
        assert_eq!(s, double_reversed);
    }
    
    #[test]
    fn test_sort_is_idempotent(mut v in prop::collection::vec(any::<i32>(), 0..100)) {
        v.sort();
        let sorted = v.clone();
        v.sort();
        assert_eq!(v, sorted);
    }
}
```

## See Also

- [rust-test-criterion-bench](test-criterion-bench.md) - Benchmarking
- [rust-test-mockall-mocking](test-mockall-mocking.md) - Mocking
- [rust-test-arrange-act-assert](test-arrange-act-assert.md) - Test structure
