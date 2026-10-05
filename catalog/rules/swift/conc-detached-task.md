---
id: swift-conc-detached-task
lang: swift
prefix: conc
title: Prefer Task over Task.detached so launched work inherits actor isolation and context
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [detached task, unstructured, context inheritance, actor]
  files: ["**/*.swift"]
  symbols: [Task, Task.detached]
related: [swift-conc-taskgroup-fanout, swift-conc-mainactor-isolate]
sources:
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
  - title: Swift Evolution SE-0304 - Structured concurrency
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md
---
> Launch unstructured work with `Task` so it inherits actor isolation, priority, and task-local values.

## Why

An unstructured task created with the `Task` initializer inherits priority, task-local values, and actor isolation from its creation context, as the structured-concurrency proposal specifies. `Task.detached` is defined to inherit none of that, so it starts with no actor, default priority, and no task-local bindings. Work that conceptually belongs to the current context belongs in a `Task`; detachment is for work that genuinely starts from a clean slate.

## Bad

```swift
@MainActor
final class ViewModel {
    var status = "idle"

    func refresh() {
        Task.detached { [weak self] in
            await self?.work()
        }
    }

    private func work() async {}
}
```

## Good

```swift
@MainActor
final class ViewModel {
    var status = "idle"

    func refresh() {
        Task {
            status = "loading"
            await work()
            status = "done"
        }
    }

    private func work() async {}
}
```

## See Also

- [swift-conc-taskgroup-fanout](conc-taskgroup-fanout.md) - structured scopes for work that must complete together
- [swift-conc-mainactor-isolate](conc-mainactor-isolate.md) - the isolation the inherited task runs under
