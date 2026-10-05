---
id: java-style-imports-no-wildcard
lang: java
prefix: style
title: "Import types explicitly, never with wildcards"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [imports, wildcard, on-demand]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-imports-order]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> List each imported type; wildcard imports hide what the file actually uses.

## Why

Google style section 3.3.1 is categorical: "wildcard ('on-demand') imports, static or otherwise, are not used." An explicit import list documents the file's dependencies, keeps two same-named types from different packages from colliding silently, and prevents a new class added to an imported package from changing which type an existing name resolves to.

## Bad

```java
import java.util.*;

class Names {
    List<String> names = new ArrayList<>();
}
```

## Good

```java
import java.util.ArrayList;
import java.util.List;

class Names {
    List<String> names = new ArrayList<>();
}
```

## See Also

- [java-style-imports-order](style-imports-order.md) - arranging the explicit imports
