---
id: cpp-const-mutable
lang: cpp
prefix: const
title: Reserve mutable for state that is not observable
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mutable, const, cache, mutex]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [mutable]
related: [cpp-const-member-functions, cpp-conc-mutex-with-data]
sources:
  - title: cppreference - cv type qualifiers
    url: https://en.cppreference.com/w/cpp/language/cv
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> mutable is for members that do not affect the externally visible state.

## Why

The cv reference defines `mutable` as permission to modify a member even in a const object, and states its purpose: the member does not affect the externally visible state of the class, as used for mutexes, memo caches, lazy evaluation, and access instrumentation — the "M&M rule" pairs mutable with mutex. Used that way, a const member function keeps its promise: callers see no change. Used to modify visible data, `mutable` lets a const method lie, and every reader of the type's interface is misled.

## Bad

```cpp
#include <string>
#include <utility>

class Session {
public:
    void rename(std::string name) const { // looks read-only, changes state
        name_ = std::move(name);
    }
    const std::string& name() const { return name_; }
private:
    mutable std::string name_ = "service";
};

int main() {
    const Session session;
    session.rename("renamed"); // observable state changed through a const method
    return session.name() == "renamed" ? 0 : 1;
}
```

## Good

```cpp
#include <string>

class Session {
public:
    const std::string& name() const { return name_; } // reads only
    void rename(std::string name) { // non-const: honest mutation
        name_ = std::move(name);
    }
private:
    std::string name_ = "service";
};

int main() {
    Session session;
    session.rename("renamed");
    return session.name() == "renamed" ? 0 : 1;
}
```

## See Also

- [cpp-const-member-functions](const-member-functions.md) - the const default this qualifies
- [cpp-conc-mutex-with-data](conc-mutex-with-data.md) - the canonical mutable member
