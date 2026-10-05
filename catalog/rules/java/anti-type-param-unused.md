---
id: java-anti-type-param-unused
lang: java
prefix: anti
title: "Do not declare a type parameter that only appears in the return type"
severity: should
enforce: tool
tool: "errorprone:TypeParameterUnusedInFormals"
baseline: latest
status: verified
triggers:
  keywords: [generics, type-parameter, unchecked, cast]
  files: ["**/*.java"]
  symbols: [TypeParameterUnusedInFormals]
related: [java-gen-generic-parameters]
sources:
  - title: "Error Prone: TypeParameterUnusedInFormals"
    url: https://errorprone.info/bugpattern/TypeParameterUnusedInFormals
---
> A type parameter that no argument mentions is an unchecked cast in disguise.

## Why

Error Prone's TypeParameterUnusedInFormals check states that "a method's type parameters should always be referenced in the declaration of one or more formal parameters. Type parameters that are only used in the return type are a source of type-unsafety", because the cast succeeds for every caller no matter what T is. Taking a Class<T> argument makes the type a runtime fact that can be checked.

## Bad

```java
class Casts {
    @SuppressWarnings("unchecked")
    static <T> T cast(Object value) {
        return (T) value;
    }
}
```

## Good

```java
class Casts {
    static <T> T cast(Object value, Class<T> type) {
        return type.cast(value);
    }
}
```

## See Also

- [java-gen-generic-parameters](gen-generic-parameters.md) - where type parameters belong
