---
id: java-coll-remove-if
lang: java
prefix: coll
title: "Remove elements with removeIf or the iterator"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [removeif, iterator, concurrent-modification]
  files: ["**/*.java"]
  symbols: [Collection.removeIf, Iterator]
related: [java-coll-immutable-factory]
sources:
  - title: "Collection API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Collection.html
  - title: "ArrayList API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/ArrayList.html
---
> Delete through removeIf or Iterator.remove; mutating the collection during iteration fails.

## Why

Collection.removeIf "removes all of the elements of this collection that satisfy the given predicate", and its implementation requirement describes the safe mechanics: the default implementation "traverses all elements of the collection using its iterator()" and removes "each matching element ... using Iterator.remove()". ArrayList documents the failure mode for any other route: if the list "is structurally modified at any time after the iterator is created, in any way except through the iterator's own remove or add methods, the iterator will throw a ConcurrentModificationException".

## Bad

```java
import java.util.ArrayList;
import java.util.List;

class Tasks {
    void dropCancelled(List<String> tasks) {
        for (String task : tasks) {
            if (task.startsWith("cancelled:")) {
                tasks.remove(task);
            }
        }
    }
}
```

## Good

```java
import java.util.List;

class Tasks {
    void dropCancelled(List<String> tasks) {
        tasks.removeIf(task -> task.startsWith("cancelled:"));
    }
}
```

## See Also

- [java-coll-immutable-factory](coll-immutable-factory.md) - removing without mutating at all
