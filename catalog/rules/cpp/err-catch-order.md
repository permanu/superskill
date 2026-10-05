---
id: cpp-err-catch-order
lang: cpp
prefix: err
title: Order catch clauses from most derived to least derived; earlier handlers hide later ones
severity: must
enforce: both
tool: clang:-Wexceptions
baseline: latest
status: verified
triggers:
  keywords: [catch, ordering, derived, hiding, handler]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [catch]
related: [cpp-err-catch-by-reference, cpp-err-no-catch-all-swallow]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - try block
    url: https://en.cppreference.com/w/cpp/language/try
---
> Order catch clauses from most derived to least derived so no handler is dead code.

## Why

Handlers are matched in the order written, and a handler for a base class matches every derived exception. A base handler placed before a derived one makes the derived handler unreachable, silently routing the specific case through the generic path. Putting `catch (...)` or `catch (const std::exception&)` first disables every handler after it.

## Bad

```cpp
#include <stdexcept>

class ProtocolError : public std::runtime_error {
public:
    ProtocolError() : std::runtime_error("protocol") {}
};

void handle() {
    try {
        throw ProtocolError{};
    } catch (const std::exception& e) { // hides the handler below
        (void)e;
    } catch (const ProtocolError& e) {  // never runs
        (void)e;
    }
}

int main() {
    handle();
}
```

## Good

```cpp
#include <stdexcept>

class ProtocolError : public std::runtime_error {
public:
    ProtocolError() : std::runtime_error("protocol") {}
};

void handle() {
    try {
        throw ProtocolError{};
    } catch (const ProtocolError& e) { // most derived first
        (void)e;
    } catch (const std::exception& e) {
        (void)e;
    }
}

int main() {
    handle();
}
```

## See Also

- [cpp-err-catch-by-reference](err-catch-by-reference.md) - each handler binds by const reference
- [cpp-err-no-catch-all-swallow](err-no-catch-all-swallow.md) - keep catch(...) last and non-empty
