---
id: java-style-modifier-order
lang: java
prefix: style
title: "Write modifiers in the JLS-recommended order"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [modifiers, order, declaration]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-constant-names]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Keep modifiers in one fixed order so declarations scan predictably.

## Why

Google style section 4.8.7 requires that class and member modifiers "appear in the order recommended by the Java Language Specification": public, protected, private, abstract, default, static, final, and the rest. The language accepts any order, so without a convention every declaration reads differently and reviewers cannot scan the modifiers without reading each word.

## Bad

```java
class Limits {
    static public final int MAX = 10;
}
```

## Good

```java
class Limits {
    public static final int MAX = 10;
}
```

## See Also

- [java-style-constant-names](style-constant-names.md) - naming the constants these modifiers create
