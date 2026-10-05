---
id: java-gen-type-param-names
lang: java
prefix: gen
title: "Name type parameters by convention: E, T, T2, or RequestT"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, type-parameter, convention, generics]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-gen-generic-parameters]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Keep type parameter names to the two accepted styles so readers recognize them at a glance.

## Why

Google style section 5.2.8 defines the convention: "Each type variable is named in one of two styles: A single capital letter, optionally followed by a single numeral (such as E, T, X, T2); A name in the form used for classes (see Section 5.2.2, Class names), followed by the capital letter T (examples: RequestT, FooBarT)." Names like First and Second look like ordinary classes, so a reader cannot tell from the declaration that they are placeholders being substituted at each call site.

## Bad

```java
class Pair<First, Second> {
    private final First first;
    private final Second second;

    Pair(First first, Second second) {
        this.first = first;
        this.second = second;
    }
}
```

## Good

```java
class Pair<F, S> {
    private final F first;
    private final S second;

    Pair(F first, S second) {
        this.first = first;
        this.second = second;
    }
}
```

## See Also

- [java-gen-generic-parameters](gen-generic-parameters.md) - the declarations these names introduce
