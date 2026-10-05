---
id: java-api-tostring
lang: java
prefix: api
title: "Override toString on types with state so logs identify instances"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tostring, logging, debugging, representation]
  files: ["**/*.java"]
  symbols: [Object.toString]
related: [java-api-equals-hashcode]
sources:
  - title: "Object API: toString"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Object.html
---
> Return a concise, state-bearing string from toString; the default is class name plus hash code.

## Why

Object.toString documents that its default implementation "returns a string consisting of the name of the class of which the object is an instance, the at-sign character '@', and the unsigned hexadecimal representation of the hash code", and that "it is recommended that all subclasses override this method". A default string identifies an instance but not its state, so every log line and debugger view needs a separate field inspection to answer what the object held.

## Bad

```java
class Money {
    private final long cents;

    Money(long cents) {
        this.cents = cents;
    }
}
```

## Good

```java
class Money {
    private final long cents;

    Money(long cents) {
        this.cents = cents;
    }

    @Override
    public String toString() {
        return "Money[cents=" + cents + "]";
    }
}
```

## See Also

- [java-api-equals-hashcode](api-equals-hashcode.md) - the equality side of the same value contract
