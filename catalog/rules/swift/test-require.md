---
id: swift-test-require
lang: swift
prefix: test
title: Unwrap optionals with #require
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [require, xctunwrap, optional]
  files: ["**/*.swift"]
related: [swift-test-expect, swift-test-define-with-attribute]
sources:
  - title: Migrating a test from XCTest
    url: https://developer.apple.com/documentation/testing/migratingfromxctest
---
> Replace `XCTUnwrap` with `#require` when a test needs an unwrapped optional.

## Why

The migration guide says XCTest has a function, `XCTUnwrap`, that tests whether an optional value is `nil` and throws an error if it is, and that with the testing library you use `#require` with optional expressions to unwrap them. Because `#require` throws, the test stops at the unwrap instead of continuing with a missing value, and the rest of the function can use the unwrapped value directly.

## Bad

```swift
// import XCTest
//
// func testFirstUser() throws {
//     let user = try XCTUnwrap(users.first)
//     XCTAssertEqual(user.name, "Ada")
// }
```

## Good

```swift
// import Testing
//
// @Test func firstUser() throws {
//     let user = try #require(users.first)
//     #expect(user.name == "Ada")
// }
```

## See Also

- [swift-test-expect](test-expect.md) - the non-throwing expectation macro
- [swift-test-define-with-attribute](test-define-with-attribute.md) - declaring a throwing test
