---
id: swift-test-define-with-attribute
lang: swift
prefix: test
title: Declare test functions with the Test attribute
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swift testing, test attribute]
  files: ["**/*.swift"]
related: [swift-test-suite-types, swift-test-expect]
sources:
  - title: Migrating a test from XCTest
    url: https://developer.apple.com/documentation/testing/migratingfromxctest
  - title: Swift Testing
    url: https://developer.apple.com/documentation/testing
---
> Identify a test function with the `@Test` attribute instead of a name prefix.

## Why

The migration guide states that an XCTest test method must be a member of a test class and its name must start with `test`, while the testing library does not require any particular name: it identifies a test function by the presence of the `@Test` attribute. The framework overview adds that a single attribute defines test functions almost anywhere, so the attribute — not the identifier — is what makes a function a test.

## Bad

```swift
// import XCTest
//
// final class MathTests: XCTestCase {
//     func testAddition() {
//         XCTAssertEqual(1 + 1, 2)
//     }
// }
```

## Good

```swift
// import Testing
//
// @Test func addition() {
//     #expect(1 + 1 == 2)
// }
```

## See Also

- [swift-test-suite-types](test-suite-types.md) - grouping test functions
- [swift-test-expect](test-expect.md) - the expectation macro to use inside the test
