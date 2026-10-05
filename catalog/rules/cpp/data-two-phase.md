---
id: cpp-data-two-phase
lang: cpp
prefix: data
title: Constructors produce complete objects
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [two-phase-initialization, constructors, invariants]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: []
related: [cpp-err-ctor-failure, cpp-init-init-not-assign]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Constructors and member initializer lists
    url: https://en.cppreference.com/w/cpp/language/constructor
---
> After the constructor returns, the object must be usable.

## Why

C.41 asks that a constructor create a fully initialized object. The constructor reference describes the point of completion: before the body begins, initialization of all bases and members is finished, and the initializer list is where non-default initialization is specified. A separate open() or init() step leaves an interval in which the object exists but does not satisfy its own invariant — every user must remember the second call, and every operation must handle the half-built state. Work belongs in the constructor; failure belongs in an exception.

## Bad

```cpp
struct Connection {
    int socket = -1;
    void open(const char* host) { socket = 42; (void)host; } // a second phase
};

int main() {
    Connection connection; // exists, but is not usable yet
    connection.open("host");
    return connection.socket == 42 ? 0 : 1;
}
```

## Good

```cpp
struct Connection {
    explicit Connection(const char* host) : socket(42) { (void)host; } // complete here
    int socket;
};

int main() {
    Connection connection("host"); // usable immediately
    return connection.socket == 42 ? 0 : 1;
}
```

## See Also

- [cpp-err-ctor-failure](err-ctor-failure.md) - what to do when construction cannot succeed
- [cpp-init-init-not-assign](init-init-not-assign.md) - where member initialization belongs
