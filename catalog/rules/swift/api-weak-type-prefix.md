---
id: swift-api-weak-type-prefix
lang: swift
prefix: api
title: Add a role noun in front of weakly typed parameters
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [weak typing, AnyObject, parameter naming, role]
  files: ["**/*.swift"]
  symbols: [AnyObject, Any]
related: [swift-api-omit-needless-words, swift-api-argument-labels]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Compensate for weak type information by preceding the parameter with its role.

## Why

The API Design Guidelines note that when a parameter's type is `NSObject`, `Any`, `AnyObject`, or a fundamental type, the use site does not convey intent on its own. The guidelines' example adds the role to the first argument, turning a vague `add(self, for: graphics)` into `addObserver(self, forKeyPath: graphics)`. The role noun is what makes weakly typed call sites self-explanatory.

## Bad

```swift
func add(_ observer: AnyObject, for keyPath: String) {}
```

## Good

```swift
func addObserver(_ observer: AnyObject, forKeyPath path: String) {}
```

## See Also

- [swift-api-omit-needless-words](api-omit-needless-words.md) - the opposite case, where words repeat strong type information
- [swift-api-argument-labels](api-argument-labels.md) - labels that clarify argument roles
