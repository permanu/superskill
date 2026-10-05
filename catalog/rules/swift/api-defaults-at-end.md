---
id: swift-api-defaults-at-end
lang: swift
prefix: api
title: Place parameters with defaults at the end of the parameter list
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default arguments, parameter order, signature]
  files: ["**/*.swift"]
  symbols: [default parameter]
related: [swift-api-default-parameters, swift-api-argument-labels]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Order required parameters before defaulted ones so the common call reads left to right.

## Why

The API Design Guidelines recommend locating parameters with defaults toward the end of the list because parameters without defaults are usually more essential to the semantics and give a stable initial pattern of use. A defaulted parameter in front of a required one forces every call to jump over it and makes the required argument look like an afterthought. Required arguments first keeps the core call shape visible at every use site.

## Bad

```swift
func animate(duration: Double = 0.3, to target: String) {}
```

## Good

```swift
func animate(to target: String, duration: Double = 0.3) {}
```

## See Also

- [swift-api-default-parameters](api-default-parameters.md) - choosing defaults over overload families
- [swift-api-argument-labels](api-argument-labels.md) - labeling the required arguments
