---
id: java-style-one-top-level-class
lang: java
prefix: style
title: "Put exactly one top-level class in each file"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [file, top-level, class, structure]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-overloads-together]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> One top-level class per file, named after the file.

## Why

Google style section 3.4.1 requires that "each top-level class resides in a source file of its own". The file name then identifies the class, so readers and tools can locate a type by name alone; when several classes share a file, the extra ones have no file-name anchor and tend to accumulate unrelated code.

## Bad

```java
class First {
    int value() {
        return 1;
    }
}

class Second {
    int value() {
        return 2;
    }
}
```

## Good

```java
class First {
    int value() {
        return 1;
    }
}
```

## See Also

- [java-style-overloads-together](style-overloads-together.md) - the member-level ordering rule
