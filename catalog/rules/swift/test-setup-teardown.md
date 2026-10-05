---
id: swift-test-setup-teardown
lang: swift
prefix: test
title: Replace setUp and tearDown with init and deinit
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [setup, teardown, init, deinit]
  files: ["**/*.swift"]
related: [swift-test-suite-types, swift-test-define-with-attribute]
sources:
  - title: Migrating a test from XCTest
    url: https://developer.apple.com/documentation/testing/migratingfromxctest
---
> Move per-test setup and teardown into the suite's `init` and `deinit`.

## Why

The migration guide says code scheduled to run before and after a test uses the `setUp` and `tearDown` family of functions in XCTest, and that testing-library suites implement `init` and `deinit` instead. It notes that both are optional, and that a suite needing teardown must be declared as a class or an actor rather than a structure, because only those can implement `deinit`.

## Bad

```swift
// import XCTest
//
// final class CartTests: XCTestCase {
//     var cart: Cart!
//
//     override func setUp() {
//         cart = Cart()
//     }
//
//     func testEmptyCart() {
//         XCTAssertEqual(cart.count, 0)
//     }
// }
```

## Good

```swift
// import Testing
//
// @Suite final class CartTests {
//     let cart: Cart
//
//     init() {
//         cart = Cart()
//     }
//
//     @Test func emptyCart() {
//         #expect(cart.count == 0)
//     }
// }
```

## See Also

- [swift-test-suite-types](test-suite-types.md) - why the suite is a class when teardown is needed
- [swift-test-define-with-attribute](test-define-with-attribute.md) - the attribute on each test function
