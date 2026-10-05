---
id: java-api-override-annotation
lang: java
prefix: api
title: "Annotate every overriding method with @Override"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [override, annotation, inheritance, signature]
  files: ["**/*.java"]
  symbols: [Override]
related: [java-api-interface-first]
sources:
  - title: "Google Java Style Guide, section 6.1: @Override"
    url: https://google.github.io/styleguide/javaguide.html#s6.1-override-annotation
---
> Mark every legal override with @Override so a broken signature fails compilation.

## Why

Google's style guide requires that "a method is marked with the @Override annotation whenever it is legal", including methods implementing an interface and accessors for record components. If a parameter list or return type drifts from the supertype, the method silently becomes an overload or a new method that is never called; @Override turns that drift into a compile error at the declaration.

## Bad

```java
class Base {
    String label() {
        return "base";
    }
}

class Child extends Base {
    String label() {
        return "child";
    }
}
```

## Good

```java
class Base {
    String label() {
        return "base";
    }
}

class Child extends Base {
    @Override
    String label() {
        return "child";
    }
}
```

## See Also

- [java-api-interface-first](api-interface-first.md) - the contracts overrides implement
