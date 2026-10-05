---
id: java-api-default-method-evolution
lang: java
prefix: api
title: "Add new interface methods as default methods so existing implementations keep compiling"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, default, evolution, compatibility]
  files: ["**/*.java"]
  symbols: [default]
related: [java-api-interface-first]
sources:
  - title: "JEP 126: Lambda Expressions & Virtual Extension Methods"
    url: https://openjdk.org/jeps/126
---
> Give a newly added interface method a default body instead of breaking every implementor.

## Why

JEP 126 introduced virtual extension methods to "allow interfaces to be evolved in a source and binary compatible fashion" and to address "the long-standing limitation of not being able to add methods to widely-used interfaces because of source compatibility concerns". An abstract addition is a breaking change for every implementation, including ones outside the codebase; a default method gives existing implementations a working body while letting them override later.

## Bad

```java
interface Event {
    String name();

    boolean isExpired();
}

class LoginEvent implements Event {
    public String name() {
        return "login";
    }

    public boolean isExpired() {
        return false;
    }
}
```

## Good

```java
interface Event {
    String name();

    default boolean isExpired() {
        return false;
    }
}

class LoginEvent implements Event {
    public String name() {
        return "login";
    }
}
```

## See Also

- [java-api-interface-first](api-interface-first.md) - choosing the interface as the contract
