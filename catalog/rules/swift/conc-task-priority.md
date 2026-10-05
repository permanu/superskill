---
id: swift-conc-task-priority
lang: swift
prefix: conc
title: Let tasks inherit priority instead of overriding it at creation
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [priority, task, inheritance, escalation]
  files: ["**/*.swift"]
  symbols: [TaskPriority, Task]
related: [swift-conc-detached-task, swift-conc-taskgroup-fanout]
sources:
  - title: Swift Evolution SE-0304 - Structured concurrency
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
---
> Create tasks without an explicit priority so the task tree can derive and escalate it.

## Why

Child tasks automatically inherit their parent's priority, and when a higher-priority task waits on a task handle, the runtime permanently raises the awaited task's priority to match. The Swift book states that raising a child's priority escalates the parent as well. An explicit priority at creation replaces that inheritance, so the scheduler loses the signal it uses to avoid priority inversion.

## Bad

```swift
func startIndexing() {
    Task(priority: .background) {
        await index()
    }
}

func index() async {}
```

## Good

```swift
func startIndexing() {
    Task {
        await index()
    }
}

func index() async {}
```

## See Also

- [swift-conc-detached-task](conc-detached-task.md) - the other piece of context a launch can drop
- [swift-conc-taskgroup-fanout](conc-taskgroup-fanout.md) - groups whose children inherit priority together
