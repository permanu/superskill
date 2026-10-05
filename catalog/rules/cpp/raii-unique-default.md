---
id: cpp-raii-unique-default
lang: cpp
prefix: raii
title: Default to unique_ptr for exclusive ownership; use shared_ptr only when lifetime is genuinely shared
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unique_ptr, shared_ptr, ownership, lifetime]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::unique_ptr, std::shared_ptr]
related: [cpp-raii-raw-non-owning, cpp-raii-weak-break-cycles, cpp-raii-param-ownership]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
  - title: cppreference - std::shared_ptr
    url: https://en.cppreference.com/w/cpp/memory/shared_ptr
---
> Own exclusively with unique_ptr; reach for shared_ptr only when several owners must keep the object alive.

## Why

`shared_ptr` adds a control block, atomic reference counting, and an ownership graph that can silently leak through cycles; it also removes the static guarantee that destruction is deterministic. `unique_ptr` is zero-overhead, makes ownership transfer explicit through moves, and can be converted to `shared_ptr` later if sharing is actually needed. Most "shared" pointers in practice only borrow.

## Bad

```cpp
#include <memory>

struct Engine {
    void start();
};

void run(std::shared_ptr<Engine> engine) { // implies shared lifetime; none exists
    engine->start();
}
```

## Good

```cpp
#include <memory>

struct Engine {
    void start();
};

void run(Engine& engine) { // borrows; no ownership transfer
    engine.start();
}

int main() {
    auto engine = std::make_unique<Engine>();
    run(*engine);
}
```

## See Also

- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - raw handles are for borrowing
- [cpp-raii-weak-break-cycles](raii-weak-break-cycles.md) - the cost of shared ownership when cycles appear
- [cpp-raii-param-ownership](raii-param-ownership.md) - parameter types that state lifetime roles
