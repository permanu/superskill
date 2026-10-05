---
id: java-perf-deque-over-stack
lang: java
prefix: perf
title: "Use ArrayDeque instead of the legacy synchronized Stack"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stack, deque, lifo, undo]
  files: ["**/*.java"]
  symbols: [Deque, ArrayDeque, Stack]
related: [java-perf-enum-set, java-perf-linkedlist-indexing]
sources:
  - title: "Deque API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Deque.html
---
> Replace java.util.Stack with ArrayDeque, the documented LIFO implementation.

## Why

The Deque documentation states that deques "can also be used as LIFO (Last-In-First-Out) stacks" and that the interface "should be used in preference to the legacy Stack class". Stack extends Vector, so every push and pop takes a monitor even when the stack is confined to one thread. ArrayDeque is the unsynchronized, array-backed Deque implementation and the intended replacement.

## Bad

```java
import java.util.Stack;

class UndoBuffer {

    private final Stack<String> history = new Stack<>();

    void record(String action) {
        history.push(action);
    }

    String undo() {
        return history.pop();
    }
}
```

## Good

```java
import java.util.ArrayDeque;
import java.util.Deque;

class UndoBuffer {

    private final Deque<String> history = new ArrayDeque<>();

    void record(String action) {
        history.push(action);
    }

    String undo() {
        return history.pop();
    }
}
```

## See Also

- [java-perf-enum-set](perf-enum-set.md) - another specialized collection choice
- [java-perf-linkedlist-indexing](perf-linkedlist-indexing.md) - matching list implementations to access patterns
