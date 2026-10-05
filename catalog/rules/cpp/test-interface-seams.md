---
id: cpp-test-interface-seams
lang: cpp
prefix: test
title: Depend on interfaces at test seams so the real dependency can be replaced
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, dependency, fake, seam]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [virtual]
related: [cpp-api-abstract-interface, cpp-test-isolation]
sources:
  - title: gMock Cookbook
    url: https://google.github.io/googletest/gmock_cook_book.html
---
> Inject the dependency as an interface so tests supply a fake instead of real time, disk, or network.

## Why

Code that constructs its own `SystemClock`, opens files directly, or calls a network client cannot be tested without those systems present, and their real behavior varies. Talking to a small interface instead lets the test pass a fake that returns fixed values, so the tested logic is exercised in isolation and its output is deterministic. Mocking frameworks exist to fill these seams, but the design decision that creates the seam is coding to an interface.

## Bad

```cpp
struct SystemClock {
    int now() const; // concrete dependency
};

int seconds_until_midnight(const SystemClock& clock);

void test_seconds_until_midnight() {
    SystemClock clock; // the test must consult real time
    seconds_until_midnight(clock);
}
```

## Good

```cpp
struct Clock {
    virtual ~Clock() = default;
    virtual int now() const = 0;
};

struct SystemClock : Clock {
    int now() const override;
};

struct FakeClock : Clock {
    int fixed = 0;
    int now() const override { return fixed; }
};

int seconds_until_midnight(const Clock& clock);

void test_seconds_until_midnight() {
    FakeClock clock;
    clock.fixed = 86399; // the test controls the input exactly
    seconds_until_midnight(clock);
}
```

## See Also

- [cpp-api-abstract-interface](api-abstract-interface.md) - the interface design this relies on
- [cpp-test-isolation](test-isolation.md) - why the fake must be per-test
