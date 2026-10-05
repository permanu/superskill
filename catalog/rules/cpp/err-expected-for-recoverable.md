---
id: cpp-err-expected-for-recoverable
lang: cpp
prefix: err
title: Return std::expected for recoverable failures instead of exceptions or out-parameters
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [expected, error, result, recoverable, parse]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::expected, std::unexpected]
related: [cpp-err-expected-monadic, cpp-err-optional-only-for-absence, cpp-err-error-code-systematic]
sources:
  - title: cppreference - std::expected
    url: https://en.cppreference.com/w/cpp/utility/expected
  - title: WG21 P0323R12 - std::expected
    url: https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2022/p0323r12.html
---
> Return std::expected from operations with expected failures; reserve exceptions for invariant violations.

## Why

A recoverable failure such as malformed input is part of the function's contract, not an exceptional event. `std::expected` makes the failure visible in the return type, carries a typed reason, and never throws, so callers cannot forget the error case without discarding the value explicitly. Out-parameters plus a boolean collapse distinct failures into one bit and hide the result's lifetime.

## Bad

```cpp
#include <exception>
#include <string>

enum class parse_error { invalid, overflow };

// Bad: failure reason is discarded; caller must pre-declare the result.
bool parse_int(const std::string& text, int& out) {
    try {
        std::size_t pos = 0;
        out = std::stoi(text, &pos);
        return pos == text.size();
    } catch (const std::exception&) {
        return false;
    }
}
```

## Good

```cpp
#include <charconv>
#include <expected>
#include <string_view>
#include <system_error>

enum class parse_error { invalid, overflow };

std::expected<int, parse_error> parse_int(std::string_view text) {
    int value = 0;
    const auto [ptr, ec] =
        std::from_chars(text.data(), text.data() + text.size(), value);
    if (ec == std::errc::result_out_of_range)
        return std::unexpected(parse_error::overflow);
    if (ec != std::errc{} || ptr != text.data() + text.size())
        return std::unexpected(parse_error::invalid);
    return value;
}
```

## See Also

- [cpp-err-expected-monadic](err-expected-monadic.md) - compose these results without unwrapping at every step
- [cpp-err-optional-only-for-absence](err-optional-only-for-absence.md) - when absence is the whole story, optional is enough
- [cpp-err-error-code-systematic](err-error-code-systematic.md) - error codes as the error type when exceptions are unavailable
