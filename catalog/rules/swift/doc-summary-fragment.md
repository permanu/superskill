---
id: swift-doc-summary-fragment
lang: swift
prefix: doc
title: Write the summary as a single sentence fragment
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, summary, doc comment]
  files: ["**/*.swift"]
related: [swift-doc-summary-verb, swift-doc-summary-separation]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Write the summary as a single sentence fragment ending with a period.

## Why

The API Design Guidelines require the summary to be a single sentence fragment that ends with a period, not a complete sentence. The summary is the part readers see first in code completion and symbol lists, so a fragment that starts with the verb carries the meaning in fewer words than a sentence that begins with a phrase such as "This function".

## Bad

```swift
/// This function returns the average of the values.
func average(_ values: [Double]) -> Double {
    values.reduce(0, +) / Double(values.count)
}
```

## Good

```swift
/// Returns the average of the values.
func average(_ values: [Double]) -> Double {
    values.reduce(0, +) / Double(values.count)
}
```

## See Also

- [swift-doc-summary-verb](doc-summary-verb.md) - choosing the verb that opens the fragment
- [swift-doc-summary-separation](doc-summary-separation.md) - separating the summary from the discussion
