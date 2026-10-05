---
id: cpp-raii-raw-non-owning
lang: cpp
prefix: raii
title: Treat raw pointers and references as non-owning; express ownership in the type
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [raw-pointer, ownership, reference, non-owning]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [T*, T&, std::unique_ptr, std::shared_ptr]
related: [cpp-raii-unique-default, cpp-raii-param-ownership, cpp-raii-wrap-resources]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::unique_ptr
    url: https://en.cppreference.com/w/cpp/memory/unique_ptr
---
> Raw pointers and references never own; return and store owners as unique_ptr or shared_ptr.

## Why

A raw pointer does not say whether the receiver must delete it, so ownership is negotiated by convention and one confused call site leaks or double-deletes. `unique_ptr` states exclusive ownership and deletes on scope exit; `shared_ptr` states shared ownership. Raw pointers remain correct for non-owning observation, where they must never outlive the owner.

## Bad

```cpp
#include <memory>

struct Session { };

Session* create_session() {
    return new Session(); // ownership undocumented: delete or not?
}

int main() {
    Session* session = create_session();
    // early return or exception here leaks *session
    delete session;
}
```

## Good

```cpp
#include <memory>

struct Session { };

std::unique_ptr<Session> create_session() {
    return std::make_unique<Session>(); // ownership is in the type
}

int main() {
    std::unique_ptr<Session> session = create_session();
}
```

## See Also

- [cpp-raii-unique-default](raii-unique-default.md) - which owner type to choose
- [cpp-raii-param-ownership](raii-param-ownership.md) - parameter types that state lifetime roles
- [cpp-raii-wrap-resources](raii-wrap-resources.md) - the general RAII rule
