---
id: swift-conc-task-local
lang: swift
prefix: conc
title: Carry request metadata in task-local values instead of threading it through every signature
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [task local, context, request id, propagation]
  files: ["**/*.swift"]
  symbols: [TaskLocal, withValue]
related: [swift-conc-detached-task, swift-conc-taskgroup-fanout]
sources:
  - title: Swift Evolution SE-0311 - Task Local Values
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0311-task-locals.md
---
> Bind request-scoped metadata with `@TaskLocal` so child tasks inherit it without parameter plumbing.

## Why

Task-local values carry metadata with a task and propagate to child tasks the same way priority does, and SE-0311 scopes every binding to a `withValue` region so values cannot outlive the task or leak between requests. Threading an identifier through every intermediate signature couples unrelated layers to the request model. The proposal reserves task locals for context metadata such as trace identifiers rather than values that affect logical outcomes.

## Bad

```swift
func handle() async {
    await fetch(1, requestID: "req-1")
}

func fetch(_ id: Int, requestID: String) async -> String {
    "\(requestID):\(id)"
}
```

## Good

```swift
enum RequestContext {
    @TaskLocal static var id: String = "unset"
}

func handle() async {
    await RequestContext.$id.withValue("req-1") {
        await fetch(1)
    }
}

func fetch(_ id: Int) async -> String {
    "\(RequestContext.id):\(id)"
}
```

## See Also

- [swift-conc-detached-task](conc-detached-task.md) - the launch form that drops task-local inheritance
- [swift-conc-taskgroup-fanout](conc-taskgroup-fanout.md) - child tasks that inherit bound values
