---
id: swift-test-suite-types
lang: swift
prefix: test
title: Group tests in suite types
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [suite, xctestcase, grouping]
  files: ["**/*.swift"]
related: [swift-test-define-with-attribute, swift-test-setup-teardown]
sources:
  - title: Migrating a test from XCTest
    url: https://developer.apple.com/documentation/testing/migratingfromxctest
---
> Group related test functions in a suite type instead of an `XCTestCase` subclass.

## Why

The migration guide says XCTest groups related test methods in classes that inherit from `XCTestCase`, while the testing library groups test functions by placing them in a Swift type it calls a suite: these types do not need to be classes and do not inherit from `XCTestCase`. It recommends converting an `XCTestCase` subclass by removing the conformance, and says a structure or actor is generally preferred over a class because the compiler can better enforce concurrency safety.

## Bad

```swift
// import XCTest
//
// final class CartTests: XCTestCase {
//     func testEmptyCart() {
//         XCTAssertEqual(Cart().count, 0)
//     }
// }
```

## Good

```swift
// import Testing
//
// @Suite struct CartTests {
//     @Test func emptyCart() {
//         #expect(Cart().count == 0)
//     }
// }
```

## See Also

- [swift-test-define-with-attribute](test-define-with-attribute.md) - what makes a function a test
- [swift-test-setup-teardown](test-setup-teardown.md) - per-test setup inside the suite
