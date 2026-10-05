---
id: java-perf-linkedlist-indexing
lang: java
prefix: perf
title: "Use ArrayList when code needs indexed access, not LinkedList"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [list, index, complexity, access]
  files: ["**/*.java"]
  symbols: [LinkedList, ArrayList]
related: [java-perf-deque-over-stack, java-perf-hashmap-capacity]
sources:
  - title: "LinkedList API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/LinkedList.html
  - title: "ArrayList API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/ArrayList.html
---
> Pick ArrayList when code walks a list by index; LinkedList documents that indexing traverses the chain.

## Why

The LinkedList documentation states that "operations that index into the list will traverse the list from the beginning or the end, whichever is closer to the specified index", so a get(i) loop over n elements performs quadratic work. ArrayList documents that its access operations "run in constant time" and that its constant factor is low. Choose the list implementation from the access pattern: indexed reads and iteration favor ArrayList, while heavy insertion and removal at the ends favors a Deque.

## Bad

```java
import java.util.LinkedList;
import java.util.List;

class ReportBuilder {

    String summarize(List<String> lines) {
        List<String> ordered = new LinkedList<>(lines);
        StringBuilder summary = new StringBuilder();
        for (int i = 0; i < ordered.size(); i++) {
            summary.append(ordered.get(i)).append('\n');
        }
        return summary.toString();
    }
}
```

## Good

```java
import java.util.ArrayList;
import java.util.List;

class ReportBuilder {

    String summarize(List<String> lines) {
        List<String> ordered = new ArrayList<>(lines);
        StringBuilder summary = new StringBuilder();
        for (int i = 0; i < ordered.size(); i++) {
            summary.append(ordered.get(i)).append('\n');
        }
        return summary.toString();
    }
}
```

## See Also

- [java-perf-deque-over-stack](perf-deque-over-stack.md) - the LIFO deque choice
- [java-perf-hashmap-capacity](perf-hashmap-capacity.md) - sizing collections for known contents
