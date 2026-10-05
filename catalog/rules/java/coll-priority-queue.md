---
id: java-coll-priority-queue
lang: java
prefix: coll
title: "Extract minimum or maximum repeatedly with PriorityQueue"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [priorityqueue, heap, minimum, queue]
  files: ["**/*.java"]
  symbols: [PriorityQueue]
related: [java-perf-deque-over-stack]
sources:
  - title: "PriorityQueue API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/PriorityQueue.html
---
> Keep work ordered by a priority heap instead of sorting the whole collection for each pick.

## Why

PriorityQueue is "an unbounded priority queue based on a priority heap", where "the queue retrieval operations poll, remove, peek, and element access the element at the head of the queue", and the implementation "provides O(log(n)) time for the enqueuing and dequeuing methods". Sorting a fresh copy on every extraction reorders all elements each time, turning a stream of n picks into repeated O(n log n) work.

## Bad

```java
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

class Scheduler {
    String next(List<String> jobs) {
        List<String> sorted = new ArrayList<>(jobs);
        sorted.sort(Comparator.naturalOrder());
        return sorted.get(0);
    }
}
```

## Good

```java
import java.util.PriorityQueue;
import java.util.Queue;

class Scheduler {
    private final Queue<String> jobs = new PriorityQueue<>();

    void submit(String job) {
        jobs.add(job);
    }

    String next() {
        return jobs.poll();
    }
}
```

## See Also

- [java-perf-deque-over-stack](perf-deque-over-stack.md) - choosing the queue shape by access pattern
