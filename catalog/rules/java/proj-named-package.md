---
id: java-proj-named-package
lang: java
prefix: proj
title: "Put every type in a named package"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [package, default-package, namespace, layout]
  files: ["**/*.java"]
  symbols: [Package]
related: [java-proj-package-naming]
sources:
  - title: "Java Tutorials: Creating and Using Packages"
    url: https://docs.oracle.com/javase/tutorial/java/package/packages.html
---
> Avoid the unnamed package; named packages prevent collisions and control access.

## Why

The Packages lesson explains that "to make types easier to find and use, to avoid naming conflicts, and to control access, programmers bundle groups of related types into packages", and that with a package "the names of your types won't conflict with the type names in other packages because the package creates a new namespace". Types left in the unnamed package cannot be imported by named packages and are not visible to module declarations, so they can only grow into a single flat namespace.

## Bad

```java
class Space {
}
```

## Good

```java
package com.example.graphics;

class Space {
}
```

## See Also

- [java-proj-package-naming](proj-package-naming.md) - how to spell the package name
