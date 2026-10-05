---
id: java-gen-generic-parameters
lang: java
prefix: gen
title: "Parameterize types instead of casting Object results"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, type-parameter, cast, type-safety]
  files: ["**/*.java"]
  symbols: [Object]
related: [java-gen-raw-types]
sources:
  - title: "Java Tutorials: Why Use Generics?"
    url: https://docs.oracle.com/javase/tutorial/java/generics/why.html
---
> Use type parameters so the compiler checks element types; Object plus casts defers failures to runtime.

## Why

The Generics lesson lists the benefits of generics over non-generic code: "Stronger type checks at compile time" and "Elimination of casts" — the same code without generics needs an explicit cast, and that cast only fails at runtime. A type parameter moves the check to the call site, where the mismatch is visible, instead of leaving it in the implementation.

## Bad

```java
class Stack {
    private Object[] items = new Object[10];
    private int size;

    void push(Object item) {
        items[size++] = item;
    }

    Object pop() {
        return items[--size];
    }
}

class Usage {
    void run() {
        Stack stack = new Stack();
        stack.push("hello");
        Integer value = (Integer) stack.pop();
    }
}
```

## Good

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Stack<T> {
    private final Deque<T> items = new ArrayDeque<>();

    void push(T item) {
        items.push(item);
    }

    T pop() {
        return items.pop();
    }
}

class Usage {
    void run() {
        Stack<String> stack = new Stack<>();
        stack.push("hello");
        String value = stack.pop();
    }
}
```

## See Also

- [java-gen-raw-types](gen-raw-types.md) - keeping the type arguments in place once the class is generic
