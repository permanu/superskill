---
id: swift-test-expect
lang: swift
prefix: test
title: Assert with #expect
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [expect, xctassert, assertion]
  files: ["**/*.swift"]
related: [swift-test-require, swift-test-define-with-attribute]
sources:
  - title: Migrating a test from XCTest
    url: https://developer.apple.com/documentation/testing/migratingfromxctest
---
> Replace the `XCTAssert` family with the `#expect` macro.

## Why

The migration guide says XCTest uses a family of approximately 40 assertion functions collectively referred to as `XCTAssert`, and that the testing library has two replacements, `#expect` and `#require`, which behave similarly to `XCTAssert` except that `#require` throws an error if its condition is not met. `#expect` takes the condition itself as a normal Swift expression instead of a dedicated function per shape of comparison, so the assertion reads like the code it checks.

## Bad

```swift
// import XCTest
//
// func testTotal() {
//     XCTAssertEqual(total([1, 2, 3]), 6)
// }
```

## Good

```swift
// import Testing
//
// @Test func total() {
//     #expect(total([1, 2, 3]) == 6)
// }
```

## See Also

- [swift-test-require](test-require.md) - the throwing variant for preconditions
- [swift-test-define-with-attribute](test-define-with-attribute.md) - declaring the test function
