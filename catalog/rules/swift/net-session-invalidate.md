---
id: swift-net-session-invalidate
lang: swift
prefix: net
title: Invalidate a session you created when it is done
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [invalidate, urlsession, lifecycle]
  files: ["**/*.swift"]
related: [swift-net-background-session, swift-async-task-handle]
sources:
  - title: URLSession.invalidateAndCancel()
    url: https://developer.apple.com/documentation/foundation/urlsession/invalidateandcancel()
---
> Invalidate a session you created when it is done.

## Why

Apple documents `invalidateAndCancel()` as cancelling all outstanding tasks and then invalidating the session, and states that after invalidation the session objects cannot be reused and references to delegate and callback objects are broken; to let outstanding tasks finish, `finishTasksAndInvalidate()` is the alternative. A session built with a custom configuration keeps its delegate and resources alive until one of those calls runs. Calling the method on the shared session has no effect, which is why this matters for the sessions an app creates itself.

## Bad

```swift
import Foundation

final class Client {
    let session = URLSession(configuration: .ephemeral)
}
```

## Good

```swift
import Foundation

final class Client {
    let session = URLSession(configuration: .ephemeral)

    func shutdown() {
        session.invalidateAndCancel()
    }
}
```

## See Also

- [swift-net-background-session](net-background-session.md) - sessions that outlive the app's active time
- [swift-async-task-handle](async-task-handle.md) - keeping a handle so work can be cancelled
