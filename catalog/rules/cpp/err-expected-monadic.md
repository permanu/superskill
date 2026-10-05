---
id: cpp-err-expected-monadic
lang: cpp
prefix: err
title: Compose fallible operations with and_then and transform instead of nested status checks
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [expected, and_then, transform, or_else, composition]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::expected, std::expected::and_then, std::expected::transform]
related: [cpp-err-expected-for-recoverable]
sources:
  - title: cppreference - std::expected
    url: https://en.cppreference.com/w/cpp/utility/expected
  - title: cppreference - Compiler support trackers
    url: https://en.cppreference.com/w/cpp/compiler_support
---
> Chain fallible steps with expected and_then/transform; let the first error short-circuit the pipeline.

## Why

Manual `if (!result) return result;` after every call repeats the same error propagation at each step and obscures the success path. `and_then` and `transform` encode that propagation once: on error they return the unexpected value untouched, so the success path reads as a straight-line pipeline and no step can accidentally swallow or reorder a failure.

## Bad

```cpp
#include <expected>
#include <string_view>
#include <system_error>

std::expected<int, std::errc> parse_int(std::string_view text);
std::expected<int, std::errc> validated(int value);

std::expected<int, std::errc> load(std::string_view text) {
    auto parsed = parse_int(text);
    if (!parsed)
        return parsed;
    auto checked = validated(*parsed);
    if (!checked)
        return checked;
    return *checked * 2;
}
```

## Good

```cpp
#include <expected>
#include <string_view>
#include <system_error>

std::expected<int, std::errc> parse_int(std::string_view text);
std::expected<int, std::errc> validated(int value);

std::expected<int, std::errc> load(std::string_view text) {
    return parse_int(text)
        .and_then(validated)
        .transform([](int value) { return value * 2; });
}
```

## See Also

- [cpp-err-expected-for-recoverable](err-expected-for-recoverable.md) - the return type this rule consumes
