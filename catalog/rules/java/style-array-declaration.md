---
id: java-style-array-declaration
lang: java
prefix: style
title: "Attach array brackets to the type, not the variable"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [array, declaration, syntax]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-style-one-variable-per-declaration]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Write String[] args; the brackets are part of the type.

## Why

Google style section 4.8.3.2 states that "the square brackets form a part of the type, not the variable: String[] args, not String args[]". The C-style form hides that the array-ness belongs to the type — which matters the moment two variables are declared together, because only the one carrying the brackets is an array.

## Bad

```java
class Main {
    void run(String args[]) {
    }
}
```

## Good

```java
class Main {
    void run(String[] args) {
    }
}
```

## See Also

- [java-style-one-variable-per-declaration](style-one-variable-per-declaration.md) - why the mixed form is dangerous
