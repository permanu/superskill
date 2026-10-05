---
id: cpp-conc-mutex-with-data
lang: cpp
prefix: conc
title: Define the mutex together with the data it guards
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mutex, guarded-data, encapsulation, locking]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::mutex]
related: [cpp-conc-atomic-not-volatile, cpp-conc-wait-predicate, cpp-api-avoid-globals]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Put the mutex next to the state it protects and lock it in every member that touches the state.

## Why

A free-standing mutex does not say what it guards, so a new accessor can read or write the shared state without taking it and the race is invisible in review. Making the mutex a private member of the class that owns the data ties each lock to exactly one payload, and every member function that touches the data locks it as its first action. Encapsulation then makes the pairing the only way to reach the state.

## Bad

```cpp
#include <mutex>
#include <vector>

std::mutex global_mutex; // unclear what this guards
std::vector<int> values;

void add(int value) {
    std::lock_guard<std::mutex> lock(global_mutex);
    values.push_back(value);
}
```

## Good

```cpp
#include <mutex>
#include <vector>

class Queue {
public:
    void add(int value) {
        std::lock_guard<std::mutex> lock(mutex_);
        values_.push_back(value);
    }
private:
    std::mutex mutex_; // guards values_, and nothing else
    std::vector<int> values_;
};
```

## See Also

- [cpp-conc-atomic-not-volatile](conc-atomic-not-volatile.md) - the other synchronization primitive
- [cpp-conc-wait-predicate](conc-wait-predicate.md) - waiting on the guarded condition
- [cpp-api-avoid-globals](api-avoid-globals.md) - why the data should not be global at all
