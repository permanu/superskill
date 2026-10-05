---
id: java-style-one-variable-per-declaration
lang: java
prefix: style
title: "Declare one variable per declaration"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [variables, declaration, formatting]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-array-declaration]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> One name per declaration; keep comma-separated lists to for-loop headers.

## Why

Google style section 4.8.2.1 says "every variable declaration (field or local) declares only one variable: declarations such as int a, b; are not used", with multiple declarations acceptable only in a for-loop header. Separate declarations give each variable its own line for comments, types, and initializers, so changing one does not force a rewrite of the others.

## Bad

```java
class Box {
    int width = 1, height = 2;
}
```

## Good

```java
class Box {
    int width = 1;
    int height = 2;
}
```

## See Also

- [java-style-array-declaration](style-array-declaration.md) - the other declaration-shape rule
