---
id: java-proj-requires-static
lang: java
prefix: proj
title: "Mark compile-time-only dependencies with requires static"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [module, requires, static, optional]
  files: ["**/*.java"]
  symbols: [ModuleDescriptor]
related: [java-proj-requires-transitive]
sources:
  - title: "ModuleDescriptor.Requires.Modifier API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/module/ModuleDescriptor.Requires.Modifier.html
---
> requires static keeps a dependency at compile time while letting it be absent at run time.

## Why

The ModuleDescriptor.Requires.Modifier documentation defines STATIC as "the dependence is mandatory in the static phase, during compilation, but is optional in the dynamic phase, during execution". A plain requires forces the dependency to be present at startup even when it is only needed for annotations or build-time processing, adding a runtime requirement that consumers must satisfy for no reason.

## Bad

```java
module com.example.processor {
    requires java.compiler;
}
```

## Good

```java
module com.example.processor {
    requires static java.compiler;
}
```

## See Also

- [java-proj-requires-transitive](proj-requires-transitive.md) - the re-exporting variant
