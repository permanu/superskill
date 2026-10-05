---
id: java-proj-requires-transitive
lang: java
prefix: proj
title: "Re-export API dependencies with requires transitive"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [module, requires, transitive, api]
  files: ["**/*.java"]
  symbols: [ModuleDescriptor]
related: [java-proj-requires-static, java-proj-module-uses]
sources:
  - title: "ModuleDescriptor.Requires.Modifier API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/module/ModuleDescriptor.Requires.Modifier.html
---
> Use requires transitive when a module's API exposes types from another module.

## Why

The ModuleDescriptor.Requires.Modifier documentation defines the modifier: "The dependence causes any module which depends on the current module to have an implicitly declared dependence on the module named by the Requires." Without it, every consumer that touches the re-exported types must remember to require the dependency itself, and the API silently becomes harder to use.

## Bad

```java
module com.example.library {
    requires java.sql;
}
```

## Good

```java
module com.example.library {
    requires transitive java.sql;
}
```

## See Also

- [java-proj-requires-static](proj-requires-static.md) - the compile-time-only variant
- [java-proj-module-uses](proj-module-uses.md) - declaring service consumption
