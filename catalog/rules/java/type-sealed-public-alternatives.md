---
id: java-type-sealed-public-alternatives
lang: java
prefix: type
title: "Expose alternatives through a public sealed type, not a package-private base class"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sealed, public, package-private, alternatives, abstraction]
  files: ["**/*.java"]
  symbols: [sealed]
related: [java-type-sealed-closed-kinds, java-type-exhaustive-switch]
sources:
  - title: "JEP 409: Sealed Classes"
    url: https://openjdk.org/jeps/409
---
> Make the base type public and sealed so consumers can name the abstraction without extending it.

## Why

JEP 409 explains why the package-private superclass trick fails for modeling alternatives: "the approach is useless when the goal is modeling alternatives, since user code cannot access the key abstraction — the superclass — in order to switch over it", and keeping it accessible without being extensible "cannot be specified without resorting to brittle tricks". Sealing separates accessibility from extensibility: everyone can read the type, only the permitted classes can implement it.

## Bad

```java
abstract class Notification {
    abstract String render();
}

class EmailNotification extends Notification {
    String render() {
        return "email";
    }
}

class SmsNotification extends Notification {
    String render() {
        return "sms";
    }
}
```

## Good

```java
public sealed interface Notification permits EmailNotification, SmsNotification {
    String render();
}

record EmailNotification(String address) implements Notification {
    public String render() {
        return "email to " + address;
    }
}

record SmsNotification(String number) implements Notification {
    public String render() {
        return "sms to " + number;
    }
}
```

## See Also

- [java-type-sealed-closed-kinds](type-sealed-closed-kinds.md) - the hierarchy this rule makes usable by consumers
- [java-type-exhaustive-switch](type-exhaustive-switch.md) - switching over the exposed abstraction
