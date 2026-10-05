---
id: cpp-raii-weak-break-cycles
lang: cpp
prefix: raii
title: Break shared_ptr ownership cycles with weak_ptr back-references
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shared_ptr, weak_ptr, cycle, leak, graph]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::shared_ptr, std::weak_ptr]
related: [cpp-raii-unique-default, cpp-raii-wrap-resources]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - std::weak_ptr
    url: https://en.cppreference.com/w/cpp/memory/weak_ptr
---
> Make one edge of every shared_ptr cycle a weak_ptr so reference counts can reach zero.

## Why

Reference counts only free an object when they reach zero, so a cycle of `shared_ptr`s keeps itself alive forever even when nothing outside the cycle refers to it. Marking back-edges (parent pointers, observers, caches) as `weak_ptr` removes them from ownership: the object is destroyed when the owning forward references go away, and readers temporarily promote the weak reference with `lock()`.

## Bad

```cpp
#include <memory>
#include <string>

struct Node {
    std::string name;
    std::shared_ptr<Node> parent; // cycle: parent and child own each other
    std::shared_ptr<Node> child;
};
```

## Good

```cpp
#include <memory>
#include <string>

struct Node {
    std::string name;
    std::weak_ptr<Node> parent; // back-reference does not own
    std::shared_ptr<Node> child;
};

int main() {
    auto parent = std::make_shared<Node>();
    auto child = std::make_shared<Node>();
    parent->child = child;
    child->parent = parent; // no ownership cycle
    if (auto p = child->parent.lock())
        p->name = "root";
}
```

## See Also

- [cpp-raii-unique-default](raii-unique-default.md) - avoiding shared ownership when possible
- [cpp-raii-wrap-resources](raii-wrap-resources.md) - deterministic destruction is the point of RAII
