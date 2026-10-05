---
id: cpp-sec-integer-overflow
lang: cpp
prefix: sec
title: Check size arithmetic for overflow before using the result
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overflow, size, multiplication, allocation]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::numeric_limits, std::length_error]
related: [cpp-sec-bounds-checked, cpp-mem-matched-alloc-free]
sources:
  - title: "CWE-190: Integer Overflow or Wraparound"
    url: https://cwe.mitre.org/data/definitions/190.html
  - title: cppreference - std::vector
    url: https://en.cppreference.com/w/cpp/container/vector
---
> Reject size computations that can wrap; a small wrapped size leads to a small allocation and a large copy.

## Why

When dimensions come from input, `rows * columns` can wrap to a small number: the allocation then succeeds with a fraction of the needed storage while the later loop writes the full, original amount, producing the classic under-allocation overflow. CWE-190 describes this as a root cause that becomes memory corruption downstream. The fix is a guard before the multiplication: if one factor exceeds `max() / other`, the product cannot be represented and the operation is refused.

## Bad

```cpp
#include <cstddef>
#include <limits>
#include <vector>

std::vector<int> make_table(std::size_t rows, std::size_t columns) {
    const std::size_t count = rows * columns; // wraps to a small value
    return std::vector<int>(count);
}

int main() {
    return static_cast<int>(make_table(std::numeric_limits<std::size_t>::max(), 2).size());
}
```

## Good

```cpp
#include <cstddef>
#include <limits>
#include <stdexcept>
#include <vector>

std::vector<int> make_table(std::size_t rows, std::size_t columns) {
    if (columns != 0 && rows > std::numeric_limits<std::size_t>::max() / columns)
        throw std::length_error("table dimensions overflow"); // refused before allocating
    return std::vector<int>(rows * columns);
}

int main() {
    return static_cast<int>(make_table(std::numeric_limits<std::size_t>::max(), 2).size());
}
```

## See Also

- [cpp-sec-bounds-checked](sec-bounds-checked.md) - the access-side check
- [cpp-mem-matched-alloc-free](mem-matched-alloc-free.md) - owning the storage that the size describes
