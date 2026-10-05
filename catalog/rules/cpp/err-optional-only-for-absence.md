---
id: cpp-err-optional-only-for-absence
lang: cpp
prefix: err
title: Use std::optional only when absence needs no explanation; use std::expected when it does
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, expected, absence, lookup, error]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::optional, std::expected]
related: [cpp-err-expected-for-recoverable]
sources:
  - title: cppreference - std::optional
    url: https://en.cppreference.com/w/cpp/utility/optional
  - title: cppreference - std::expected
    url: https://en.cppreference.com/w/cpp/utility/expected
  - title: WG21 P0323R12 - std::expected
    url: https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2022/p0323r12.html
---
> Return std::optional when "nothing" is self-explanatory; return std::expected when the caller must know why.

## Why

`std::optional` models the presence or absence of a value, not the reason for the absence. Collapsing missing, unreadable, and malformed into an empty optional erases information the caller needs to react or report. `std::expected` carries the reason in the error type, so downstream code branches on causes instead of guessing.

## Bad

```cpp
#include <optional>
#include <string>

enum class load_error { missing, unreadable, malformed };

// Bad: all three failure modes collapse into "no value".
std::optional<int> read_port(const std::string& path);

int main() {
    return read_port("config").value_or(-1);
}
```

## Good

```cpp
#include <expected>
#include <string>

enum class load_error { missing, unreadable, malformed };

std::expected<int, load_error> read_port(const std::string& path);

int main() {
    auto port = read_port("config");
    return port ? *port : static_cast<int>(port.error());
}
```

## See Also

- [cpp-err-expected-for-recoverable](err-expected-for-recoverable.md) - expected as the general recoverable-failure type
