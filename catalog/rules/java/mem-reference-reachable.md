---
id: java-mem-reference-reachable
lang: java
prefix: mem
title: "Keep registered reference objects strongly reachable"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reference, reference-queue, cleanup]
  files: ["**/*.java"]
  symbols: [WeakReference, ReferenceQueue]
related: [java-mem-refers-to]
sources:
  - title: "java.lang.ref package summary"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ref/package-summary.html
---
> A reference object must stay reachable itself; if it is collected, it is never enqueued and the cleanup never runs.

## Why

The java.lang.ref package documentation states that "if a registered reference becomes unreachable itself, then it will never be enqueued" and that "it is the responsibility of the program to ensure that reference objects remain reachable for as long as the program is interested in their referents". A reference created and dropped on the spot may be collected before the referent changes, so the queue stays empty and the intended notification never arrives.

## Bad

```java
import java.lang.ref.ReferenceQueue;
import java.lang.ref.WeakReference;

class Watcher {
    private final ReferenceQueue<Object> queue = new ReferenceQueue<>();

    void watch(Object target) {
        new WeakReference<>(target, queue);
    }
}
```

## Good

```java
import java.lang.ref.ReferenceQueue;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

class Watcher {
    private final ReferenceQueue<Object> queue = new ReferenceQueue<>();
    private final List<WeakReference<Object>> watched = new ArrayList<>();

    void watch(Object target) {
        watched.add(new WeakReference<>(target, queue));
    }
}
```

## See Also

- [java-mem-refers-to](mem-refers-to.md) - comparing referents without strengthening them
