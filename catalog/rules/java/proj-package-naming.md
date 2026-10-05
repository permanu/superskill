---
id: java-proj-package-naming
lang: java
prefix: proj
title: "Name packages in lowercase reverse-DNS form"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [package, naming, convention, namespace]
  files: ["**/*.java"]
  symbols: [Package]
related: [java-proj-named-package]
sources:
  - title: "Java Tutorials: Naming a Package"
    url: https://docs.oracle.com/javase/tutorial/java/package/namingpkgs.html
---
> Use all-lowercase, dot-separated package names rooted in a reversed domain name.

## Why

The Naming a Package lesson states that "package names are written in all lower case to avoid conflict with the names of classes or interfaces", and that "companies use their reversed Internet domain name to begin their package names—for example, com.example.mypackage for a package named mypackage created by a programmer at example.com". The reversed domain keeps independently written packages from colliding, and the all-lowercase form keeps a package name from being mistaken for a type name.

## Bad

```java
package com.example.deep_space;

class Space {
}
```

## Good

```java
package com.example.deepspace;

class Space {
}
```

## See Also

- [java-proj-named-package](proj-named-package.md) - putting types in packages at all
