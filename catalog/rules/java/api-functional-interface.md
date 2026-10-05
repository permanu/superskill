---
id: java-api-functional-interface
lang: java
prefix: api
title: "Annotate single-abstract-method interfaces with @FunctionalInterface"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [functional, interface, lambda, annotation]
  files: ["**/*.java"]
  symbols: [FunctionalInterface]
related: [java-api-interface-first]
sources:
  - title: "FunctionalInterface API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/FunctionalInterface.html
---
> Mark lambda-target interfaces @FunctionalInterface so the compiler guards their single-method shape.

## Why

The FunctionalInterface API states that "if a type is annotated with this annotation type, compilers are required to generate an error message unless" it is an interface and satisfies the functional-interface requirements. Without the annotation, adding a second abstract method during maintenance compiles cleanly at the interface and breaks every lambda at its use sites; with it, the mistake is reported where it is introduced.

## Bad

```java
interface Validator {
    boolean isValid(String value);
}

class Form {
    boolean check(Validator validator, String value) {
        return validator.isValid(value);
    }
}
```

## Good

```java
@FunctionalInterface
interface Validator {
    boolean isValid(String value);
}

class Form {
    boolean check(Validator validator, String value) {
        return validator.isValid(value);
    }
}
```

## See Also

- [java-api-interface-first](api-interface-first.md) - the contract this interface represents
