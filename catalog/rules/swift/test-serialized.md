---
id: swift-test-serialized
lang: swift
prefix: test
title: Serialize suites that share state
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [serialized, parallel, shared state]
  files: ["**/*.swift"]
related: [swift-test-suite-types, swift-test-define-with-attribute]
sources:
  - title: Migrating a test from XCTest
    url: https://developer.apple.com/documentation/testing/migratingfromxctest
---
> Annotate a suite that shares state with `.serialized`.

## Why

The migration guide states that the testing library runs all tests in a suite in parallel by default, while XCTest runs each test in a suite sequentially. It warns that tests using shared state such as global variables can see unexpected behavior, including unreliable outcomes, when run in parallel, and directs you to annotate the suite with `.serialized` to run the tests within that suite serially.

## Bad

```swift
// import Testing
//
// @Suite struct RegisterTests {
//     @Test func addItem() {
//         Register.shared.add("item")
//     }
// }
```

## Good

```swift
// import Testing
//
// @Suite(.serialized) struct RegisterTests {
//     @Test func addItem() {
//         Register.shared.add("item")
//     }
// }
```

## See Also

- [swift-test-suite-types](test-suite-types.md) - declaring the suite the trait is attached to
- [swift-test-define-with-attribute](test-define-with-attribute.md) - the test functions inside it
