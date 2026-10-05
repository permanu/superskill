---
id: java-api-interface-first
lang: java
prefix: api
title: "Define behavior contracts as interfaces; reserve abstract classes for shared state and code"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, abstract, contract, inheritance]
  files: ["**/*.java"]
  symbols: [interface]
related: [java-api-default-method-evolution, java-type-sealed-closed-kinds]
sources:
  - title: "Java Tutorials: Abstract Methods and Classes"
    url: https://docs.oracle.com/javase/tutorial/java/IandI/abstract.html
---
> Declare a behavior contract as an interface and use an abstract class only to share state or code.

## Why

The tutorial's decision list recommends an interface when "unrelated classes would implement your interface" or you "want to specify the behavior of a particular data type, but not concerned about who implements its behavior", and an abstract class when you "want to share code among several closely related classes". An abstract class makes the contract single-inheritance and ties implementors to a state layout; an interface lets any type participate, including records and classes that already extend something else.

## Bad

```java
abstract class PaymentProcessor {
    abstract boolean charge(String account, long cents);
}

class CardProcessor extends PaymentProcessor {
    boolean charge(String account, long cents) {
        return true;
    }
}
```

## Good

```java
interface PaymentProcessor {
    boolean charge(String account, long cents);
}

class CardProcessor implements PaymentProcessor {
    public boolean charge(String account, long cents) {
        return true;
    }
}
```

## See Also

- [java-api-default-method-evolution](api-default-method-evolution.md) - adding behavior to the interface later
- [java-type-sealed-closed-kinds](type-sealed-closed-kinds.md) - closing a hierarchy of implementations
