---
id: cpp-init-static-local
lang: cpp
prefix: init
title: Initialize on first use with a function-local static
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static-local, lazy-initialization, thread-safety]
  files: ["**/*.cpp"]
  symbols: [static]
related: [cpp-const-constinit, cpp-api-avoid-globals]
sources:
  - title: cppreference - Storage class specifiers
    url: https://en.cppreference.com/w/cpp/language/storage_duration
---
> A block static runs its initializer exactly once, safely, when control first reaches it.

## Why

The storage-duration reference states the behavior: block variables with static storage duration are initialized the first time control passes through their declaration, the declaration is skipped on later calls, and if multiple threads attempt to initialize the same static local concurrently, the initialization occurs exactly once. Hand-rolled lazy initialization — a pointer plus a null check, or a flag — has to reproduce that guarantee itself and usually leaks or races. The function-local static is the language's version of the pattern.

## Bad

```cpp
#include <vector>

const std::vector<int>& primes() {
    static const std::vector<int>* table = nullptr; // hand-rolled lazy init
    if (table == nullptr)
        table = new std::vector<int>{2, 3, 5, 7};
    return *table;
}

int main() {
    return primes().size() == 4 ? 0 : 1;
}
```

## Good

```cpp
#include <vector>

const std::vector<int>& primes() {
    static const std::vector<int> table{2, 3, 5, 7}; // initialized on first use
    return table;
}

int main() {
    return primes().size() == 4 ? 0 : 1;
}
```

## See Also

- [cpp-const-constinit](const-constinit.md) - the global-scope counterpart
- [cpp-api-avoid-globals](api-avoid-globals.md) - passing state instead of reaching for it
