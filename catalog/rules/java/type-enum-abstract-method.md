---
id: java-type-enum-abstract-method
lang: java
prefix: type
title: "Prefer abstract methods over functional fields in enums"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, abstract-method, functional-interface]
  files: ["**/*.java"]
  symbols: [Enum]
related: [java-lint-immutable-enum]
sources:
  - title: "Error Prone: ImmutableEnumChecker"
    url: https://errorprone.info/bugpattern/ImmutableEnumChecker
---
> Give each constant an abstract method instead of a Predicate or Function field.

## Why

Error Prone's ImmutableEnumChecker includes the tip: "Instead of creating an enum with functional interface fields (Predicate, Function, etc.), declare abstract methods that are overridden by each constant." Abstract methods keep callers independent of one interface type, make each constant's behavior visible in its declaration, and avoid a field that would otherwise have to be deeply immutable.

## Bad

```java
import java.util.function.Predicate;

enum Types {
    STRING(o -> o instanceof String),
    NUMBER(o -> o instanceof Number);

    final Predicate<Object> compatible;

    Types(Predicate<Object> compatible) {
        this.compatible = compatible;
    }
}
```

## Good

```java
enum Types {
    STRING {
        @Override
        public boolean compatible(Object o) {
            return o instanceof String;
        }
    },
    NUMBER {
        @Override
        public boolean compatible(Object o) {
            return o instanceof Number;
        }
    };

    public abstract boolean compatible(Object o);
}
```

## See Also

- [java-lint-immutable-enum](lint-immutable-enum.md) - the immutability requirement this tip sidesteps
