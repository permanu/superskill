---
id: swift-conc-actor-reentrancy
prefix: conc
lang: swift
title: Re-check actor invariants after every await because actor methods are reentrant
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [actor, reentrancy, await, invariant]
  files: ["**/*.swift"]
  symbols: [actor, await]
related: [swift-conc-actor-state, swift-err-cancellation-check]
sources:
  - title: Swift Evolution SE-0306 - Actors
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0306-actors.md
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
---
> Perform each invariant-sensitive mutation synchronously; actor state can change across an `await`.

## Why

Actor-isolated functions are reentrant: when one suspends, other work interleaves on the actor before it resumes, so state read before an `await` can be stale after it. The Swift book describes the same hazard when an update appends a measurement before updating the maximum, leaving a temporary inconsistent state that must not be observable. Keeping the check and the mutation on one side of the suspension point preserves the invariant.

## Bad

```swift
actor Account {
    private var balance = 100

    func withdraw(_ amount: Int) async -> Bool {
        guard balance >= amount else { return false }
        await record(amount)
        balance -= amount
        return true
    }

    private func record(_ amount: Int) async {}
}
```

## Good

```swift
actor Account {
    private var balance = 100

    func withdraw(_ amount: Int) async -> Bool {
        guard balance >= amount else { return false }
        balance -= amount
        await record(amount)
        return true
    }

    private func record(_ amount: Int) async {}
}
```

## See Also

- [swift-conc-actor-state](conc-actor-state.md) - why the state lives in an actor at all
- [swift-err-cancellation-check](err-cancellation-check.md) - the other state change that awaits can hide
