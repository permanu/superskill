---
id: swift-doc-markup
lang: swift
prefix: doc
title: Format longer documentation with recognized markup elements
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, markup, lists]
  files: ["**/*.swift"]
related: [swift-doc-summary-separation, swift-doc-callouts]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Format longer documentation with recognized markup elements.

## Why

The API Design Guidelines direct authors to use Swift's dialect of Markdown and the recognized symbol documentation markup elements for information beyond the summary. Lists, headings, and code listings are rendered by tooling and scanned by readers; the same content packed into one prose paragraph forces every reader to parse conditions and steps out of running text.

## Bad

```swift
/// Validates the password. The password must contain at least eight characters. It must include one digit. It must include one uppercase letter.
func isValidPassword(_ password: String) -> Bool {
    password.count >= 8 && password.contains(where: \.isNumber) && password.contains(where: \.isUppercase)
}
```

## Good

```swift
/// Returns whether the password meets the policy.
///
/// The password must contain:
///
/// - at least eight characters
/// - at least one digit
/// - at least one uppercase letter
func isValidPassword(_ password: String) -> Bool {
    password.count >= 8 && password.contains(where: \.isNumber) && password.contains(where: \.isUppercase)
}
```

## See Also

- [swift-doc-summary-separation](doc-summary-separation.md) - the blank line that starts the discussion
- [swift-doc-callouts](doc-callouts.md) - the bullet items tools treat specially
